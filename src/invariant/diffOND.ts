export const OND_SKIP_OLD = "_";
export const OND_SAME = "=";
export const OND_INSERT = "+";
export const OND_DELETE = "-";

export function areEq<S, A>(v1: S, v2: S, getKey: (s: S) => A) {
  return getKey(v1) === getKey(v2);
}

export function diff<S, A>(
  children: S[],
  oldChildren: S[],
  getKey: (s: S) => A,
  newStart = 0,
  newEnd = children.length - 1,
  oldStart = 0,
  oldEnd = oldChildren.length - 1
) {
  var rows = newEnd - newStart + 1;
  var cols = oldEnd - oldStart + 1;
  var dmax = rows + cols;

  var v: number[][] = [];
  var d = 0;
  var k = 0;
  var r = 0;
  var c = 0;
  var pv: number[];
  var cv: number[];
  var pd = 0;
  outer: for (d = 0; d <= dmax; d++) {
    //if (d > 50) return true;
    pd = d - 1;
    pv = d ? v[d - 1] : [0, 0];
    cv = v[d] = [];
    for (k = -d; k <= d; k += 2) {
      if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
        c = pv[pd + k + 1];
      } else {
        c = pv[pd + k - 1] + 1;
      }
      r = c - k;
      while (
        c < cols &&
        r < rows &&
        areEq(children[newStart + r], oldChildren[oldStart + c], getKey)
      ) {
        c++;
        r++;
      }
      if (c === cols && r === rows) {
        break outer;
      }
      cv[d + k] = c;
    }
  }

  var edits: string[] = Array(d / 2 + dmax / 2);
  var c: number, r: number;
  var deleteMap: Map<any, any>= new Map();
  var oldCh: S, newCh: S;
  var diffIdx = edits.length - 1;
  for (d = v.length - 1; d >= 0; d--) {
    while (
      c > 0 &&
      r > 0 &&
      areEq(oldChildren[oldStart + c - 1], children[newStart + r - 1], getKey)
    ) {
      // diagonal edge = equality
      edits[diffIdx--] = OND_SAME;
      c--;
      r--;
    }
    if (!d) break;
    pd = d - 1;
    pv = d ? v[d - 1] : [0, 0];
    k = c - r;
    if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
      // vertical edge = insertion
      r--;
      edits[diffIdx--] = OND_INSERT;
    } else {
      // horizontal edge = deletion
      c--;
      edits[diffIdx] = OND_DELETE;
      oldCh = oldChildren[oldStart + c];
      const key = getKey(oldCh);
      if (key != null) {
        deleteMap.set(key,  { diffIdx, chIdx: oldStart + c );
      }
      diffIdx--;
    }
  }

  r = 0;
  c = 0;
  for (let i = 0; i < edits.length; i++) {
    const op = edits[i];
    if (op === OND_SAME) {
      r++;
      c++;
    } else if (op === OND_INSERT) {
      newCh = children[r];
      const key = getKey(newCh);
      if (key != null) {
        const idx = deleteMap.get(key);
        if (idx != null) {
          edits[i] = idx.chIdx;
          edits[idx.diffIdx] = OND_SKIP_OLD;
        }
      }
      r++;
    } else {
      c++;
    }
  }

  return edits;
}
