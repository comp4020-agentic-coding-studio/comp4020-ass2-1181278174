export function supportsWalking(device: { wide: boolean; fine: boolean; coarse: boolean; touchPoints: number }) {
  return device.wide && (device.fine || (!device.coarse && device.touchPoints === 0));
}
