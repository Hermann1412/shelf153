const clean = (value) => {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Error) return { name: value.name, message: value.message };
  return value;
};

export const financialLog = (level, event, context = {}) => {
  const payload = Object.fromEntries(
    Object.entries({ timestamp: new Date().toISOString(), level, event, ...context })
      .map(([key, value]) => [key, clean(value)])
      .filter(([, value]) => value !== undefined),
  );
  const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  writer(JSON.stringify(payload));
};
