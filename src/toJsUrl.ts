
export function toJsUrl(jsRaw: string) {
  let bj = new Blob([jsRaw], { type: "application/javascript" });
  let url = URL.createObjectURL(bj);
  return url;
}
