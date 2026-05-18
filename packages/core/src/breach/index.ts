export interface BreachResult {
  breached: boolean;
  count: number;
}

export async function checkBreach(_password: string): Promise<BreachResult> {
  return {
    breached: false,
    count: 0,
  };
}
