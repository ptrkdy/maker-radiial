import React from "react";
import { Box, useStdout } from "ink";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  const height = stdout?.rows || 24;

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      overflow="hidden"
    >
      <Header />
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        paddingY={1}
        overflow="hidden"
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
