import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy } from "lucide-react"

// Dummy data for leaderboard
const leaderboardData = [
  { id: 1, name: "أحمد", score: 980, quizzesCompleted: 15 },
  { id: 2, name: "فاطمة", score: 950, quizzesCompleted: 12 },
  { id: 3, name: "محمد", score: 920, quizzesCompleted: 18 },
  { id: 4, name: "سارة", score: 900, quizzesCompleted: 10 },
  { id: 5, name: "خالد", score: 880, quizzesCompleted: 14 },
  { id: 6, name: "نورة", score: 850, quizzesCompleted: 11 },
  { id: 7, name: "علي", score: 830, quizzesCompleted: 9 },
  { id: 8, name: "ليلى", score: 800, quizzesCompleted: 13 },
  { id: 9, name: "يوسف", score: 780, quizzesCompleted: 8 },
  { id: 10, name: "ريم", score: 750, quizzesCompleted: 16 },
]

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">لوحة المتصدرين</h1>
          <p className="mt-3 max-w-[700px] mx-auto text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-300">
            تنافس مع زملائك وشاهد من هو الأفضل!
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">أفضل 10 طلاب</CardTitle>
            <CardDescription>قائمة بأعلى الدرجات في الاختبارات.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">الترتيب</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead className="text-right">النقاط</TableHead>
                  <TableHead className="text-right">الاختبارات المكتملة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-center">
                      {index === 0 && <Trophy className="inline-block h-5 w-5 text-yellow-500 mr-1" />}
                      {index === 1 && <Trophy className="inline-block h-5 w-5 text-gray-400 mr-1" />}
                      {index === 2 && <Trophy className="inline-block h-5 w-5 text-amber-700 mr-1" />}
                      {index + 1}
                    </TableCell>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell className="text-right">{entry.score}</TableCell>
                    <TableCell className="text-right">{entry.quizzesCompleted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}
