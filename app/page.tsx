"use client"

import { useState, useReducer, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Pause, Play } from "lucide-react"

type Question = {
  word: string
  meaning: string
  example: string
  question: string
  options: string[]
}

type Dataset = {
  vocabulary: Question[]
}

type QuizState = {
  questions: Question[]
  currentQuestionIndex: number
  userAnswers: string[]
  score: number
  quizCompleted: boolean
  currentAnswer: string | null
  isCorrect: boolean | null
  shuffledOptions: string[]
  fixedOptions: string[]
  isPaused: boolean
  speedLevel: number
}

type QuizAction =
  | { type: "SET_QUESTIONS"; payload: Question[] }
  | { type: "ANSWER_QUESTION"; payload: string }
  | { type: "NEXT_QUESTION" }
  | { type: "RESET_QUIZ" }
  | { type: "SET_CURRENT_ANSWER"; payload: string }
  | { type: "CHECK_ANSWER" }
  | { type: "SHUFFLE_OPTIONS"; payload: string[] }
  | { type: "SET_FIXED_OPTIONS"; payload: string[] }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_SPEED_LEVEL"; payload: number }

const initialState: QuizState = {
  questions: [],
  currentQuestionIndex: 0,
  userAnswers: [],
  score: 0,
  quizCompleted: false,
  currentAnswer: null,
  isCorrect: null,
  shuffledOptions: [],
  fixedOptions: [],
  isPaused: false,
  speedLevel: 1,
}

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_QUESTIONS":
      return { ...initialState, questions: action.payload }
    case "ANSWER_QUESTION":
      return {
        ...state,
        userAnswers: [...state.userAnswers, action.payload],
        score: action.payload === state.questions[state.currentQuestionIndex].word ? state.score + 1 : state.score,
      }
    case "SET_CURRENT_ANSWER":
      return { ...state, currentAnswer: action.payload }
    case "CHECK_ANSWER":
      return {
        ...state,
        isCorrect: state.currentAnswer === state.questions[state.currentQuestionIndex].word,
      }
    case "NEXT_QUESTION":
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        quizCompleted: state.currentQuestionIndex === state.questions.length - 1,
        currentAnswer: null,
        isCorrect: null,
        fixedOptions: [],
      }
    case "RESET_QUIZ":
      return { ...initialState, questions: state.questions }
    case "SHUFFLE_OPTIONS":
      return { ...state, shuffledOptions: action.payload }
    case "SET_FIXED_OPTIONS":
      return { ...state, fixedOptions: action.payload }
    case "TOGGLE_PAUSE":
      return { ...state, isPaused: !state.isPaused }
    case "SET_SPEED_LEVEL":
      return { ...state, speedLevel: action.payload }
    default:
      return state
  }
}

export default function VocabularyQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialState)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)
  const [remainingTime, setRemainingTime] = useState(5000)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        try {
          const parsedData: Dataset = JSON.parse(content)
          setDataset(parsedData)
          dispatch({ type: "SET_QUESTIONS", payload: parsedData.vocabulary })
        } catch (error) {
          console.error("Error parsing JSON:", error)
        }
      }
      reader.readAsText(file)
    }
  }

  const currentQuestion = state.questions[state.currentQuestionIndex]

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  useEffect(() => {
    if (currentQuestion && currentQuestion.options.length > 0) {
      const fixedOptions = shuffleArray([...currentQuestion.options])
      dispatch({ type: "SET_FIXED_OPTIONS", payload: fixedOptions })
      setRemainingTime(5000)
    }
  }, [currentQuestion])

  useEffect(() => {
    if (currentQuestion && !state.isPaused && state.currentAnswer === null) {
      const newTimer = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 100) {
            clearInterval(newTimer)
            handleAnswer(currentQuestion.word)
            return 0
          }
          return prevTime - 100 / ((state.speedLevel * 5) / 5)
        })
      }, 100)
      setTimer(newTimer)

      return () => {
        if (newTimer) clearInterval(newTimer)
      }
    } else if (state.isPaused && timer) {
      clearInterval(timer)
    }
  }, [currentQuestion, state.isPaused, state.currentAnswer, state.speedLevel])

  useEffect(() => {
    if (currentQuestion && currentQuestion.options.length === 0) {
      const newQuestions = state.questions.map((q) => ({
        ...q,
        options: [q.word, ...generateRandomOptions(q.word, state.questions)],
      }))
      dispatch({ type: "SET_QUESTIONS", payload: newQuestions })
    }
  }, [currentQuestion, state.questions])

  useEffect(() => {
    if (state.currentAnswer !== null && !state.quizCompleted) {
      const nextQuestionTimer = setTimeout(() => {
        dispatch({ type: "NEXT_QUESTION" })
      }, 1000)
      return () => clearTimeout(nextQuestionTimer)
    }
  }, [state.currentAnswer, state.quizCompleted])

  const handleAnswer = (answer: string) => {
    if (timer) clearInterval(timer)
    dispatch({ type: "SET_CURRENT_ANSWER", payload: answer })
    dispatch({ type: "CHECK_ANSWER" })
  }

  const resetQuiz = () => {
    dispatch({ type: "RESET_QUIZ" })
  }

  const togglePause = () => {
    dispatch({ type: "TOGGLE_PAUSE" })
  }

  const toggleSpeedLevel = () => {
    const nextLevel = (state.speedLevel % 3) + 1
    dispatch({ type: "SET_SPEED_LEVEL", payload: nextLevel })
  }

  const generateRandomOptions = (correctAnswer: string, allQuestions: Question[]): string[] => {
    const otherWords = allQuestions.filter((q) => q.word !== correctAnswer).map((q) => q.word)
    const shuffled = otherWords.sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 3)
  }

  const highlightAnswer = (text: string, answer: string) => {
    const parts = text.split(new RegExp(`(${answer})`, "gi"))
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === answer.toLowerCase() ? (
            <span key={i} className="font-bold text-green-600">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </span>
    )
  }

  if (!dataset) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="w-full max-w-md">
          <div className="p-4 border-b">
            <h1 className="text-2xl font-bold text-center">Vocabulary Quiz</h1>
          </div>
          <div className="p-4">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
              Upload JSON Dataset
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-violet-50 file:text-violet-700
                hover:file:bg-violet-100"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      <div className="w-full h-screen flex flex-col">
        <header className="flex justify-between items-center p-4 border-b">
          <h1 className="text-2xl font-bold">Vocabulary Quiz</h1>
          <div className="flex items-center space-x-4">
            <span className="text-lg font-semibold">
              {state.currentQuestionIndex + 1}/{state.questions.length}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={toggleSpeedLevel}
                className={`w-12 h-12 rounded-full text-white hover:opacity-80 transition-colors flex items-center justify-center text-sm ${
                  state.speedLevel === 1 ? "bg-red-500" : state.speedLevel === 2 ? "bg-yellow-500" : "bg-blue-500"
                }`}
              >
                {state.speedLevel * 5}sec
              </button>
              <button
                onClick={togglePause}
                className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
              >
                {state.isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            </div>
          </div>
        </header>
        <main className="flex-grow overflow-y-auto p-4">
          {!state.quizCompleted ? (
            <>
              <div className="mb-4 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${(remainingTime / 5000) * 100}%` }}
                ></div>
              </div>
              <p className="text-xl mb-4">{currentQuestion.question}</p>
              <div className="space-y-4">
                {state.fixedOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={state.currentAnswer !== null}
                    className={`w-full p-4 text-lg font-semibold rounded-lg transition-colors duration-200 ${
                      state.currentAnswer === null
                        ? "bg-blue-100 hover:bg-blue-200 text-blue-800"
                        : state.currentAnswer === option
                          ? state.isCorrect
                            ? "bg-green-200 text-green-800"
                            : "bg-red-200 text-red-800"
                          : option === currentQuestion.word && !state.isCorrect
                            ? "bg-green-200 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {(state.isCorrect !== null || state.currentAnswer !== null) && (
                <div
                  className={`mt-4 p-4 rounded ${
                    state.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  <p className="text-xl font-bold mb-2">{state.isCorrect ? "正解！！" : "不正解！"}</p>
                  <div className="flex justify-start gap-4 mt-2">
                    <p>
                      <span className="font-bold">正解:</span> {currentQuestion.word}
                    </p>
                    <p>
                      <span className="font-bold">意味:</span> {currentQuestion.meaning}
                    </p>
                  </div>
                  <p className="mt-2">
                    <span className="font-bold">例文:</span>{" "}
                    {highlightAnswer(currentQuestion.example, currentQuestion.word)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4">Quiz Completed!</h2>
              <p className="text-lg">
                Your score: {state.score} out of {state.questions.length}
              </p>
            </>
          )}
        </main>
        <footer className="p-4 border-t">
          {state.quizCompleted && (
            <Button onClick={resetQuiz} className="w-full">
              Restart Quiz
            </Button>
          )}
        </footer>
      </div>
    </div>
  )
}

