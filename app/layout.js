export const metadata = {
  title: "The Oracle — PC Compliance",
  description: "Producer Company compliance tracking, live",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
