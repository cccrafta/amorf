// Piece registry: each content type an entity view can show is a piece kind, registered by its own file in this
// folder. View, placement and gestures only see the shape below, never a specific kind.
import type React from "react";
import type { FieldNode } from "../../types";

// board pieces sit on the table and pan with it; float pieces sit in the fixed reading column.
export type PieceLayer = "board" | "float";

// Computed once per open entity and shared by every kind's build: heroAt is the media index that leads the board
// (-1 when none does), live the media index of the one playable element (null when none).
export type PieceCtx = { o: FieldNode; W: number; narrow: boolean; heroAt: number; live: number | null };

// ref is the piece's layout address, cols its default span on the board, tall its pixel height at a pixel width.
export type PieceSpec<D> = { key: string; ref: string; cols: number; tall: (w: number) => number; at?: [number, number]; data: D };

export type PieceKind<D> = {
  kind: string;
  layer: PieceLayer;
  // source is the template entry's field name, for kinds that can read more than one; most ignore it.
  build(ctx: PieceCtx, source?: string): PieceSpec<D>[];
  // h is the authored crop height, set when a board piece is cropped to its module rows.
  render(data: D, h: number | null): React.ReactNode;
};

const kinds = new Map<string, PieceKind<unknown>>();

export const registerPiece = <D>(k: PieceKind<D>) => { kinds.set(k.kind, k as PieceKind<unknown>); };
export const pieceFor = (kind: string) => kinds.get(kind);

// Line count from an average glyph advance of k em: an estimate, so a piece's row span errs a little tall.
export const lines = (s: string, w: number, fs: number, k = 0.5) => Math.max(1, Math.ceil((s.length * fs * k) / Math.max(40, w)));
// Caption row under a picture (the kind label shows even without a caption) plus the mat border.
export const capH = (cap: string, w: number) => 17 + lines(cap || " ", w - 70, 13.5, 0.46) * 20;
