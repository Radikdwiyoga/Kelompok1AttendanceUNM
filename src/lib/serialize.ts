export function serializePrisma(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'bigint') {
    return data.toString();
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(serializePrisma);
  }

  if (typeof data === 'object') {
    const serialized: any = {};
    for (const key in data) {
      serialized[key] = serializePrisma(data[key]);
    }
    return serialized;
  }

  return data;
}
