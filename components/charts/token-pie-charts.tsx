import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@radix-ui/react-separator';

// Pie chart for get_token_balances
export function TokenPieChart({ result }: { result: any }) {
  console.log('TokenPieChartTokenPieChart result ---->', result);

  // Helper to check if a string is valid JSON
  function tryParseJson(text: string) {
    try {
      return [JSON.parse(text), true];
    } catch {
      return [null, false];
    }
  }

  let dataObj: any = null;
  if (result && result.content) {
    if (Array.isArray(result.content)) {
      // Try to find the first item with text that is valid JSON
      for (const item of result.content) {
        if (typeof item.text === 'string') {
          const [parsed, isJson] = tryParseJson(item.text);
          if (isJson) {
            dataObj = parsed;
            break;
          }
        }
      }
    } else if (typeof result.content.text === 'string') {
      const [parsed, isJson] = tryParseJson(result.content.text);
      if (isJson) dataObj = parsed;
    }
  }

  if (!dataObj || typeof dataObj !== 'object') {
    return null;
  }

  const pieData = Object.entries(dataObj.balances)
    .map(([key, value]) => {
      // Extract token name from key: A.abc.{TokenName}.Vault
      const match = key.match(/^A\.[^.]+\.([^.]+)\.Vault$/);
      return match ? { name: match[1], value: parseFloat(value as string) } : null;
    })
    .filter((d): d is { name: string; value: number } => d !== null)
    .filter(d => d.value > 0);

  if (pieData.length === 0) {
    return null;
  }

  console.log('TokenPieChart pieData ---->', pieData);

  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
  ];

  return (
    <Card className="w-full mx-auto mb-4 bg-neutral-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Token Balances</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-4 justify-center">
        {pieData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2 min-w-[120px]">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="font-medium text-sm">{entry.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </CardFooter>
    </Card>
  );
}