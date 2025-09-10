"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CssBaseline,
  Paper,
  TextField,
  Typography,
} from "@mui/material"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { motion, AnimatePresence } from "framer-motion"

type Message =
  | { id: string; role: "system" | "user"; content: string }
  | { id: string; role: "assistant"; content?: string; imageBase64?: string }

function uid() {
  return Math.random().toString(36).slice(2)
}

const VISUALIZATION_TOOLS = [
  "Bar Chart: Compare totals (Revenue, Expenses, Profit)",
  "Pie Chart: Show distribution of KPI totals",
  "Time Series: Track metrics over createdAt timestamps",
  "Scatter Plot: Explore relationship between Product Price and Expense",
  "Histogram: Visualize distribution of Transaction Amounts",
  "Box Plot: Compare Transaction Amounts grouped by Buyer",
]

const SUGGESTIONS = [
  'Bar Chart → Compare "totalRevenue", "totalExpenses", and "totalProfit" from KPI.',
  "Pie Chart → Show share of Revenue vs Expenses vs Profit.",
  'Time Series → Plot KPI totals across "createdAt".',
  'Scatter Plot → Compare "price" vs "expense" for Products.',
  'Histogram → Show frequency distribution of "amount" in Transactions.',
  'Box Plot → Compare "amount" across different "buyer" categories in Transactions.',
]


const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1e1f23" },
    background: { default: "#1e1f23", paper: "rgba(36,36,39,0.6)" },
    divider: "rgba(255,255,255,0.1)",
  },
  typography: {
    fontFamily: 'Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
})

export default function Page() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: uid(),
      role: "system",
      content: "📊 VISUALIZATION TOOLS:\n" + VISUALIZATION_TOOLS.map((t) => `• ${t}`).join("\n"),
    },
  ])

  const listRef = useRef<HTMLDivElement>(null)

  // Auto scroll
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const hasAssistantTyping = useMemo(() => loading, [loading])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value)
  }

  const addUserMessage = (content: string) => {
    setMessages((prev) => [...prev, { id: uid(), role: "user", content }])
  }

  const addAssistantTextMessage = (content: string) => {
    setMessages((prev) => [...prev, { id: uid(), role: "assistant", content }])
  }

  const addAssistantImageMessage = (imageBase64: string) => {
    setMessages((prev) => [...prev, { id: uid(), role: "assistant", imageBase64, content: "Here is your chart." }])
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    const currentPrompt = prompt.trim()
    addUserMessage(currentPrompt)
    setPrompt("")
    setLoading(true)

    try {
      const res = await fetch("http://localhost:1337/dashboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt }),
      })


      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      const data: { graph?: string } = await res.json()

      if (data?.graph) {
        addAssistantImageMessage(data.graph)
      } else {
        addAssistantTextMessage("I didn’t receive an image from the server.")
      }
    } catch (err) {
      console.error("Error generating dashboard:", err)
      addAssistantTextMessage("Something went wrong generating the chart.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        maxWidth="lg"
        mx="auto"
        height="100vh"
        display="flex"
        flexDirection="column"
        p={2}
      >

        {/* Chat */}
        <Paper
          ref={listRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "rgba(36,36,39,0.3)",
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChatBubble message={m} />
              </motion.div>
            ))}
          </AnimatePresence>
          {hasAssistantTyping && <AssistantTyping />}
        </Paper>

        {/* Suggestions */}
        <Card
          variant="outlined"
          sx={{
            mb: 2,
            mt: 2,
            bgcolor: "rgba(36,36,39,0.4)",
            borderColor: "divider",
            backdropFilter: "blur(12px)",
          }}
        >
          <CardHeader title={<Typography>Try prompts</Typography>} />
          <CardContent sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s}
                label={s}
                onClick={() => setPrompt(s)}
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  borderColor: "divider",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                  "& .MuiChip-label": { whiteSpace: "pre-wrap" },
                }}
              />
            ))}
          </CardContent>
        </Card>

        {/* Input */}
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{
            mt: 1,
            display: "flex",
            alignItems: "center",
            p: 1,
            borderRadius: 3,
            backgroundColor: "rgba(36,36,39,0.6)",
            backdropFilter: "blur(16px)",
          }}
        >
          <TextField
            fullWidth
            placeholder="Type here..."
            value={prompt}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                  ; (e.target as HTMLInputElement).form?.requestSubmit()
              }
            }}
            disabled={loading}
            size="small"
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: { color: "white", px: 1 },
            }}
          />
          <Button type="submit" variant="contained" disabled={loading || !prompt.trim()}>
            {loading ? "..." : "Send"}
          </Button>
        </Paper>
      </Box>
    </ThemeProvider>
  )
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const isAssistant = message.role === "assistant"

  return (
    <Box display="flex" justifyContent={isUser ? "flex-end" : "flex-start"} gap={1.5} alignItems="flex-end">
      {isAssistant && (
        <img
          src="/bot.gif"
          alt="Bot"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "2px solid #3b82f6",
            boxShadow: "0 0 12px #3b82f6",
          }}
        />
      )}

      <Box
        sx={{
          maxWidth: "70%",
          borderRadius: 3,
          px: 2,
          py: 1.5,
          bgcolor: isSystem
            ? "rgba(255, 255, 255, 0.08)"
            : isUser
              ? "rgba(59, 130, 246, 0.9)"
              : "rgba(30, 31, 35, 0.6)",
          color: "white",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          transition: "all 0.3s ease-in-out",

          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0 0 20px rgba(100,150,200,0.4)",
          },
        }}
      >
        {isAssistant && message.imageBase64 ? (
          <Box>
            {message.content && <Typography variant="body2" mb={1}>{message.content}</Typography>}
            <img
              src={`data:image/png;base64,${message.imageBase64}`}
              alt="Generated graph"
              style={{ width: "100%", maxHeight: "400px", objectFit: "contain", borderRadius: "8px" }}
            />
          </Box>
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {message.content}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

function AssistantTyping() {
  return (
    <Box display="flex" justifyContent="flex-start" gap={1.5} alignItems="center" mb={1}>
      <img
        src="/bot.gif"
        alt="Bot"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: "2px solid #3b82f6",
          boxShadow: "0 0 10px #3b82f6",
        }}
      />
      <Box
        sx={{
          maxWidth: "70%",
          borderRadius: 3,
          px: 2,
          py: 1,
          bgcolor: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Box display="flex" alignItems="center" gap={0.5}>
          <Dot /> <Dot /> <Dot />
        </Box>
      </Box>
    </Box>
  )
}

function Dot() {
  return (
    <motion.span
      style={{
        display: "inline-block",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: "white",
      }}
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  )
}
