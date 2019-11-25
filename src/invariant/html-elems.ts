import { IDom, ChildElem, IDomEnvironment, el, attr } from "./idom";

export function withTag(tag: string) {
  return <S, C = {}, E = never>(...dirs: ChildElem<S, C, E>[]) =>
    el(tag, ...dirs);
}

export function withTagAndDirs(tag: string, ...children: any[]) {
  return <S, C = {}, E = never>(...dirs: ChildElem<S, C, E>[]): IDom<S, C, E> =>
    el(tag, ...children.concat(dirs));
}

export const div = withTag("div");
export const span = withTag("span");
export const pre = withTag("pre");
export const p = withTag("p");
export const section = withTag("section");

export const h1 = withTag("h1");
export const h2 = withTag("h2");
export const h3 = withTag("h3");
export const h4 = withTag("h4");
export const h5 = withTag("h5");
export const h6 = withTag("h6");

export const form = withTag("form");
export const fieldset = withTag("fieldset");
export const legend = withTag("legend");
export const button = withTag("button");
export const input = withTag("input");
export const checkbox = withTagAndDirs("input", attr("type", "checkbox"));
export const radio = withTagAndDirs("input", attr("type", "radio"));

export const label = withTag("label");
export const ul = withTag("ul");
export const li = withTag("li");

export const hr = withTag("hr");
export const br = withTag("br");
