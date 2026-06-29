import React from "react";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden bg-background">
      {/* Ambient floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-[100px] opacity-40 dark:opacity-30"
          style={{ background: "radial-gradient(circle, hsl(142 71% 45%), transparent 70%)" }}
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-20 w-[32rem] h-[32rem] rounded-full blur-[110px] opacity-30 dark:opacity-25"
          style={{ background: "radial-gradient(circle, hsl(220 80% 55%), transparent 70%)" }}
          animate={{ x: [0, -50, 0], y: [0, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 w-[24rem] h-[24rem] rounded-full blur-[100px] opacity-20 dark:opacity-15"
          style={{ background: "radial-gradient(circle, hsl(280 70% 60%), transparent 70%)" }}
          animate={{ x: [0, 30, -30, 0], y: [0, -20, 20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/[0.02]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "hsl(142 71% 45%)",
              boxShadow: "0 10px 30px -6px hsl(142 71% 45% / 0.5)",
            }}
          >
            <Icon className="w-7 h-7 text-white" aria-hidden="true" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
            className="text-[28px] font-semibold tracking-tight text-foreground"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
              className="text-sm text-muted-foreground mt-2"
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
          className="relative rounded-3xl p-8 border"
          style={{
            background: "hsl(var(--card) / 0.6)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderColor: "hsl(var(--border) / 0.7)",
            boxShadow:
              "0 20px 60px -12px rgb(0 0 0 / 0.12), 0 8px 24px -8px rgb(0 0 0 / 0.08), inset 0 1px 0 0 hsl(0 0% 100% / 0.15)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          {children}
        </motion.div>

        {footer && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            {footer}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}