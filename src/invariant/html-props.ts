import { Lens, set } from "./Lens";
import {
  IDom,
  IDomNode,
  ChildElem,
  IDomEnvironment,
  IDomEffect,
  el,
  on,
  prop,
  Gettable,
  isGetter,
  view,
  concat
} from "./idom";

function withProp<T>(name: string) {
  return <S, C, E>(getter: Gettable<S, C, T>) => prop<S, C, E>(name, getter);
}

export const id = withProp<string>("id");
export const type = withProp<string>("type");
export const value = withProp("value");
export const labelFor = withProp<string>("labelFor");
export const name = withProp<string>("name");
export const checked = withProp<boolean>("checked");
export const placeholder = withProp<string>("placeholder");

export const className = withProp<string>("className");
export const styleText = withProp<string>("style");

export function style<S, C, E>(
  obj: {
    [K in keyof CSSStyleDeclaration]?: Gettable<S, C, CSSStyleDeclaration[K]>
  }
): IDomEffect<S, C, E> {
  return function styleIDom({ parent, onChange, state, context }) {
    const dynamicStylesKeys: string[] = [];
    const dynamicStylesValues: any[] = [];

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (isGetter(value)) {
        dynamicStylesKeys.push(key);
        dynamicStylesValues.push(value);
        (parent as HTMLElement).style[key] = view(value, state, context);
      } else {
        (parent as HTMLElement).style[key] = value;
      }
    });
    if (dynamicStylesKeys.length > 0) {
      onChange((state, context) => {
        dynamicStylesKeys.forEach((key, i) => {
          const value = dynamicStylesValues[i];
          (parent as HTMLElement).style[key] = view(value, state, context);
        });
      });
    }
  };
}

let uid = 0;

type Stylesheet<S, C> = {
  classname: string;
  getStyle: Gettable<S, C, string>;
};

export function stylesheet<S, C>(
  getCss: (root: any) => Gettable<S, C, string>
): Stylesheet<S, C> {
  const classname = `idom-css-${++uid}`;
  return {
    classname,
    getStyle: getCss(`.${classname}`)
  };
}

export function withStylesheet<S, C, E>(
  sheet: Stylesheet<S, C>,
  dom: IDomNode<S, C, E>
): IDomNode<S, C, E> {
  return function domWithStylesheet(env) {
    const { parent, onChange, state, context } = env;
    const el = document.createElement("style") as HTMLStyleElement;
    if (isGetter(sheet.getStyle)) {
      console.log(view(sheet.getStyle, state, context));
      el.textContent = scope(
        view(sheet.getStyle, state, context),
        sheet.classname
      );
      onChange((state, context) => {
        el.textContent = scope(
          view(sheet.getStyle as any, state, context),
          sheet.classname
        );
      });
    } else {
      el.textContent = scope(sheet.getStyle, sheet.classname);
    }
    document.head.appendChild(el);
    const node = dom(env);
    (node as Element).classList.add(sheet.classname);
    return node;
  };
}

function scope(rules: string, className: string): string {
  return rules.replace(/\&/g, `.${className}`);
}

export function bindValue<State, Context, Event>(
  lens: Lens<State, string>,
  event: string = "input"
): IDom<State, Context, Event> {
  return concat(
    value(lens),
    on(event, (env, event) => {
      env.update(set(lens, event.target.value));
    })
  );
}
