export function formatFoodName(name: string, brand?: string) {
  return brand ? `${name} (${brand})` : name;
}
