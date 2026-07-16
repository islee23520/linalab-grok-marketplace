import { copyFile, mkdir, open, readFile, rename, stat } from "node:fs/promises"
import path from "node:path"
import { ConfigWriteError } from "./errors"

export async function readText(pathname: string): Promise<string> {
  try {
    return await readFile(pathname, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return ""
    throw new ConfigWriteError(pathname, { cause: error })
  }
}

export async function writeAtomicWithBackup(
  pathname: string,
  content: string,
  now: Date,
): Promise<string | null> {
  const directory = path.dirname(pathname)
  await mkdir(directory, { recursive: true })
  const exists = await fileExists(pathname)
  const backup = exists ? `${pathname}.cliproxy-backup-${safeTimestamp(now)}` : null
  const temporary = `${pathname}.tmp-${process.pid}-${crypto.randomUUID()}`
  try {
    if (backup !== null) await copyFile(pathname, backup)
    const handle = await open(temporary, "wx", exists ? (await stat(pathname)).mode : 0o600)
    try {
      await handle.writeFile(content, "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, pathname)
    const directoryHandle = await open(directory, "r")
    try {
      await directoryHandle.sync()
    } finally {
      await directoryHandle.close()
    }
    return backup
  } catch (error) {
    throw new ConfigWriteError(pathname, { cause: error })
  }
}

async function fileExists(pathname: string): Promise<boolean> {
  try {
    await stat(pathname)
    return true
  } catch (error) {
    if (isMissingFile(error)) return false
    throw error
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

function safeTimestamp(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-")
}
