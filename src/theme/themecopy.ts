function isObj(t: unknown) {
  return {}.toString.call(t).match(/([a-z]+)(:?\])/i)[1] === "Object";
}

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown> ? RecursivePartial<T[P]> : T[P];
};

export function themeCopy<R>(target: R, ...sources: RecursivePartial<R>[]): R {
  if (!isObj(target)) return target;
  const t = Object.assign({}, target) as Record<string, unknown>;
  sources.forEach((source) => {
    if (!isObj(source)) return;
    const s = source as Record<string, unknown>;
    Object.keys(s).forEach((k) => {
      if (isObj(t[k]) && isObj(s[k])) t[k] = themeCopy(t[k], s[k]);
      else t[k] = s[k];
    });
  });
  return t as R;
}
