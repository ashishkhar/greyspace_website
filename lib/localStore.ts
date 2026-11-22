import { promises as fs } from "fs";
import path from "path";
import { Board, FeedbackEntry } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const BOARDS_FILE = path.join(DATA_DIR, "boards.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

async function ensureDataFile(filePath: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf8");
  }
}

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  await ensureDataFile(filePath);
  const raw = await fs.readFile(filePath, "utf8");
  if (!raw.trim()) {
    return [];
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeJsonFile<T>(filePath: string, payload: T[]) {
  await ensureDataFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function getBoards() {
  return readJsonFile<Board>(BOARDS_FILE);
}

export async function saveBoards(boards: Board[]) {
  return writeJsonFile(BOARDS_FILE, boards);
}

export async function getFeedback() {
  return readJsonFile<FeedbackEntry>(FEEDBACK_FILE);
}

export async function saveFeedback(entries: FeedbackEntry[]) {
  return writeJsonFile(FEEDBACK_FILE, entries);
}

export function generateBoardCode(boardName: string) {
  const clean = boardName
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((x) => x.slice(0, 2).toUpperCase())
    .join("")
    .slice(0, 6);

  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${clean || "BOARD"}-${suffix}`;
}

export function uniqueId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
