// "use client"

// import { useState, useEffect } from "react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import { LoadingSpinner } from "@/components/ui/loading-spinner"
// import Link from "next/link"
// import { Clock, Star, Trophy, BookOpen, Target, ArrowLeft } from "lucide-react"
// import { motion } from "framer-motion"
// import type { QuizWithDetails } from "@/services/student.service"

// export function FeaturedQuizzes() {
//   const [quizzes, setQuizzes] = useState<QuizWithDetails[]>([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     fetchFeaturedQuizzes()
//   }, [])

//   const fetchFeaturedQuizzes = async () => {
//     try {
//       const response = await fetch("/api/student/quizzes?popular=true&limit=6")
//       if (response.ok) {
//         const data = await response.json()
//         setQuizzes(data.quizzes)
//       }
//     } catch (error) {
//       console.error("Error fetching featured quizzes:", error)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const getDifficultyColor = (level: string) => {
//     switch (level) {
//       case "easy":
//         return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
//       case "medium":
//         return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
//       case "hard":
//         return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
//       default:
//         return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
//     }
//   }

//   const getDifficultyText = (level: string) => {
//     switch (level) {
//       case "easy":
//         return "سهل"
//       case "medium":
//         return "متوسط"
//       case "hard":
//         return "صعب"
//       default:
//         return level
//     }
//   }

//   if (loading) {
//     return (
//       <section className="py-16 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-7xl mx-auto">
//           <div className="flex items-center justify-center py-20">
//             <LoadingSpinner />
//           </div>
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-blue-900/20 dark:via-gray-900 dark:to-purple-900/20">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
//           <div className="flex items-center justify-center gap-3 mb-4">
//             <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg">
//               <Trophy className="h-8 w-8 text-white" />
//             </div>
//             <h2 className="text-4xl font-bold text-gray-900 dark:text-white">الاختبارات المميزة</h2>
//           </div>
//           <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
//             اختبارات مختارة بعناية من أفضل الجامعات السعودية لتحسين مستواك الأكاديمي
//           </p>
//         </motion.div>

//         {/* Quizzes Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//           {quizzes.map((quiz, index) => (
//             <motion.div
//               key={quiz.id}
//               initial={{ opacity: 0, y: 30 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ delay: 0.1 * index }}
//               whileHover={{ y: -8, scale: 1.02 }}
//               className="group"
//             >
//               <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden">
//                 {/* Quiz Header */}
//                 <CardHeader className="pb-4 relative">
//                   <div className="absolute top-4 left-4">
//                     <Badge className={getDifficultyColor(quiz.difficultyLevel)}>
//                       {getDifficultyText(quiz.difficultyLevel)}
//                     </Badge>
//                   </div>

//                   <div className="pt-8">
//                     <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">
//                       {quiz.title}
//                     </CardTitle>

//                     {/* University & Subject Info */}
//                     <div className="mt-3 space-y-2">
//                       <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
//                         <BookOpen className="h-4 w-4" />
//                         <span>{quiz?.subject?.major?.university?.name}</span>
//                       </div>
//                       <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
//                         <Target className="h-4 w-4" />
//                         <span>{quiz.subject?.name}</span>
//                       </div>
//                     </div>
//                   </div>
//                 </CardHeader>

//                 <CardContent className="space-y-6">
//                   {/* Description */}
//                   {quiz.description && (
//                     <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
//                       {quiz.description}
//                     </p>
//                   )}

//                   {/* Quiz Stats */}
//                   <div className="grid grid-cols-3 gap-3">
//                     <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
//                       <BookOpen className="h-4 w-4 text-blue-600 mx-auto mb-1" />
//                       <div className="text-sm font-bold text-blue-600">{quiz._count.questions}</div>
//                       <p className="text-xs text-blue-700 dark:text-blue-300">سؤال</p>
//                     </div>
//                     <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
//                       <Clock className="h-4 w-4 text-green-600 mx-auto mb-1" />
//                       <div className="text-sm font-bold text-green-600">{quiz.timeLimit}</div>
//                       <p className="text-xs text-green-700 dark:text-green-300">دقيقة</p>
//                     </div>
//                     <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
//                       <Star className="h-4 w-4 text-purple-600 mx-auto mb-1" />
//                       <div className="text-sm font-bold text-purple-600">{quiz.totalPoints}</div>
//                       <p className="text-xs text-purple-700 dark:text-purple-300">نقطة</p>
//                     </div>
//                   </div>

//                   {/* Tags */}
//                   {quiz.tags && quiz.tags.length > 0 && (
//                     <div className="flex flex-wrap gap-2">
//                       {quiz.tags.slice(0, 3).map((tag, tagIndex) => (
//                         <Badge key={tagIndex} variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700">
//                           {tag}
//                         </Badge>
//                       ))}
//                       {quiz.tags.length > 3 && (
//                         <Badge variant="outline" className="text-xs">
//                           +{quiz.tags.length - 3}
//                         </Badge>
//                       )}
//                     </div>
//                   )}

//                   {/* Action Button */}
//                   <Button
//                     asChild
//                     className="w-full h-12 rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-700 hover:to-purple-600 group-hover:shadow-xl transition-all duration-300"
//                   >
//                     <Link href={`/quiz/${quiz.id}`} className="flex items-center justify-center gap-2">
//                       <Trophy className="h-5 w-5" />
//                       ابدأ الاختبار
//                       <ArrowLeft className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
//                     </Link>
//                   </Button>
//                 </CardContent>
//               </Card>
//             </motion.div>
//           ))}
//         </div>

//         {/* View All Button */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.5 }}
//           className="text-center mt-12"
//         >
//           <Button
//             asChild
//             size="lg"
//             variant="outline"
//             className="h-14 px-8 text-lg rounded-xl shadow-lg border-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-700"
//           >
//             <Link href="/quizzes" className="flex items-center gap-2">
//               <BookOpen className="h-5 w-5" />
//               استكشف جميع الاختبارات
//               <ArrowLeft className="h-4 w-4" />
//             </Link>
//           </Button>
//         </motion.div>
//       </div>
//     </section>
//   )
// }
