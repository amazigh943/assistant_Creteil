export { normalize } from "@/lib/search";

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bpb\b/gi, "problème"],
  [/\bpbs\b/gi, "problèmes"],
  [/\bmdp\b/gi, "mot de passe"],
  [/\butil\b/gi, "utilisateur"],
  [/\buser\b/gi, "utilisateur"],
  [/\brdv\b/gi, "rendez-vous"],
  [/\btel\b/gi, "téléphone"],
  [/\bpc\b/gi, "poste"],
  [/\bimp\b/gi, "imprimante"],
  [/\bcnx\b/gi, "connexion"],
  [/\bdem\b/gi, "demain"],
  [/\bok\b/gi, "OK"],
];

/**
 * Mise en forme déterministe d'une note rapide : espaces, abréviations
 * courantes, majuscule initiale et ponctuation finale.
 */
export function tidyNote(note: string): string {
  let text = note.replace(/\s+/g, " ").trim();
  if (!text) return "";
  for (const [pattern, replacement] of ABBREVIATIONS) text = text.replace(pattern, replacement);
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?…]$/.test(text)) text += ".";
  return text;
}

/** Première phrase d'un texte, tronquée proprement. */
export function firstSentence(text: string, max = 180): string {
  const sentence = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
  if (sentence.length <= max) return sentence;
  return sentence.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
