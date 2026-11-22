export type BoardImage = {
  id: string;
  url: string;
  title: string;
  description?: string;
};

export type Board = {
  id: string;
  projectName: string;
  name: string;
  code: string;
  images: BoardImage[];
  createdAt: string;
};

export type FeedbackEntry = {
  boardCode: string;
  imageId: string;
  /** Per-image like, or board-level client submit (see CLIENT_SUBMIT_IMAGE_ID). `up` is legacy. */
  reaction: "like" | "submit" | "up";
  comment?: string;
  createdAt: string;
  updatedAt?: string;
};
