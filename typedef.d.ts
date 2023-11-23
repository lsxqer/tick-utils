



declare module "next-tick" {
  export function nextTick(callback: () => void): void;
  export default nextTick;
}