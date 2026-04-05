export interface AntiPatternDef {
  id: string;
  severity: 'high' | 'medium' | 'low';
  points: number;
  test: RegExp | ((text: string, history?: string[]) => boolean);
  hint: string;
}

export interface PositiveSignalDef {
  id: string;
  points: number;
  test: RegExp;
}
