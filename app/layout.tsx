import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AmeriWound",
  description:
    "AmeriWound affiliated physicians are highly trained wound care providers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
