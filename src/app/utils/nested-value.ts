export function getNestedValue(record: Record<string, unknown>, path: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, record);
}

export function nestedValueToExportExpression(itemVar: string, path: string): string {
  if (!path.includes('.')) {
    return `${itemVar}['${path}']`;
  }

  const [head, ...rest] = path.split('.');
  let expr = `${itemVar}['${head}']`;
  for (const segment of rest) {
    expr += `?.['${segment}']`;
  }
  return expr;
}
