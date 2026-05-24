import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">اتصل بنا</h1>
          <p className="mt-3 max-w-[700px] mx-auto text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-300">
            نحن هنا للإجابة على أسئلتك ومساعدتك.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">أرسل لنا رسالة</CardTitle>
              <CardDescription>املأ النموذج أدناه وسنتواصل معك في أقرب وقت ممكن.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل</Label>
                  <Input id="name" placeholder="أدخل اسمك" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" type="email" placeholder="example@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">الموضوع</Label>
                  <Input id="subject" placeholder="موضوع رسالتك" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">الرسالة</Label>
                  <Textarea id="message" placeholder="اكتب رسالتك هنا..." className="min-h-[120px]" required />
                </div>
                <Button type="submit" className="w-full">
                  إرسال الرسالة
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">معلومات الاتصال</CardTitle>
              <CardDescription>يمكنك التواصل معنا عبر الطرق التالية:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-lg text-gray-700 dark:text-gray-300">
                  <Mail className="h-6 w-6 text-primary" />
                  <span>info@saudibank.edu.sa</span>
                </div>
                <div className="flex items-center gap-3 text-lg text-gray-700 dark:text-gray-300">
                  <Phone className="h-6 w-6 text-primary" />
                  <span>+966 11 123 4567</span>
                </div>
                <div className="flex items-center gap-3 text-lg text-gray-700 dark:text-gray-300">
                  <MapPin className="h-6 w-6 text-primary" />
                  <span>الرياض، المملكة العربية السعودية</span>
                </div>
              </div>
              <div className="aspect-video w-full rounded-lg overflow-hidden">
                {/* Placeholder for a map embed */}
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.0000000000005!2d46.675296!3d24.713552!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2f03890d488d8b%3A0x1872990f6b53f04b!2sRiyadh%2C%20Saudi%20Arabia!5e0!3m2!1sen!2sus!4v1678901234567!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
