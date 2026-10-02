import "./globals.css";
export const metadata = { title: "SteamCardOptimizer", description: "Find the best trading card swaps in your Steam inventory." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
