import type { NovaPoshtaDelivery } from "@/lib/validations/schemas";

export function formatNovaPoshtaAddress(value: NovaPoshtaDelivery) {
  const kind =
    value.warehouseCategory === "Postomat" ? "Поштомат" : "Відділення";
  const place = value.warehouseAddress.trim() || value.warehouseDescription;
  return `Нова Пошта, ${value.cityName}: ${kind} №${value.warehouseNumber}, ${place}`;
}
