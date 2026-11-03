// Importing a kind's file registers it; a new kind is one file here plus one import line.
import "./title";
import "./meta";
import "./para";
import "./plate";
import "./media";
import "./video";

export { pieceFor, type PieceCtx, type PieceLayer } from "./registry";
export { buildPieces, templateFor, DEFAULT_TEMPLATE, type TemplateEntry } from "./template";
