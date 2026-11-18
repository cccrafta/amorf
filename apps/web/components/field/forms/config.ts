// Field forms tuning: the numbers that fit the lab's forms to the field's cards. Look and feel change here, not in the shader.

// The card's picture plate in field px (ui/stage.tsx: card width 400, plate svg height 266).
export const PLATE_W = 400;
export const PLATE_H = 266;
// Float against the lab's motion matrix: bob and sway amplitudes (lab units, scaled to px by the form) and the tilt wobbles (radians).
// The lab's amplitudes are for a form two units wide on a grid; a card's form is 400 px wide and stands still beside its text.
export const FLOAT_SCALE = 0.3;
export const ROT_SCALE = 0.4;
// Satellite orbit radius against the lab's: a cluster in the field must not reach the neighbouring card.
export const SAT_REACH = 0.6;
