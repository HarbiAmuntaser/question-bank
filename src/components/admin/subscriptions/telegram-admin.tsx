"use client";

import { useCallback, useEffect, useId, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, ExternalLink, Link2, Loader2, Power, RefreshCw, Search, ShieldAlert, Unlink, Users } from "lucide-react";

import { searchPaymentSubjectsAction } from "@/app/admin/subscriptions/actions";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { AsyncCombobox, type ComboOption } from "@/components/admin/seo/AsyncCombobox";
import type { TelegramAdminData, TelegramChannelRow } from "@/components/admin/subscriptions/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API = "/api/v1/admin/telegram";

type Detail = {
  memberships: Array<{ id: string; principalType: "account" | "guest_grant"; telegramUserId: string; status: string; accessExpiresAt: string | null; lastErrorCode: string | null; user: { email: string } | null; codeAccessGrant: { code: { supportReference: string | null } } | null }>;
  events: Array<{ id: string; eventType: string; actorType: string; createdAt: string; actor: { email: string } | null }>;
  jobs: Array<{ id: string; type: string; status: string; attempts: number; lastErrorCode: string | null }>;
  pagination: { page: number; total: number; totalPages: number };
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "-";
}
function maskedId(value: string) { return value.length < 7 ? "••••" : value.slice(0, 3) + "•••" + value.slice(-4); }
function errorMessage(code?: string) {
  return ({
    telegram_disable_channel_first: "عطّل الانضمامات الجديدة أولًا.",
    telegram_memberships_must_be_removed: "يجب إنهاء معالجة العضويات قبل فصل القناة.",
    telegram_jobs_must_be_settled: "توجد مهام مزامنة لم تكتمل بعد.",
    telegram_channel_unhealthy: "تحقق من صحة القناة وصلاحيات البوت قبل التفعيل.",
    telegram_target_changed: "تغيرت القناة. حدّث الصفحة ثم أعد المحاولة.",
    telegram_channel_already_connected: "المادة مرتبطة بقناة لم تُفصل بعد.",
    telegram_unavailable: "خدمة تيليجرام غير متاحة أو إعدادها غير مكتمل.",
    too_many_requests: "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.",
  } as Record<string, string>)[code ?? ""] ?? "تعذر تنفيذ العملية. لم يتم اعتماد تغيير جزئي.";
}
async function postTelegram(body: unknown) {
  const response = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", body: JSON.stringify(body) });
  const result = await response.json().catch(() => null) as { error?: string; data?: unknown } | null;
  if (!response.ok) throw new Error(result?.error ?? "telegram_unavailable");
  return result?.data;
}
function useTableParams() {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  return (changes: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) => value === null || value === "" ? next.delete(key) : next.set(key, String(value)));
    router.push(pathname + "?" + next.toString(), { scroll: false });
  };
}

function ConnectDialog({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false); const [subject, setSubject] = useState<ComboOption | null>(null);
  const [link, setLink] = useState<{ startUrl: string; expiresAt: string } | null>(null); const [pending, startTransition] = useTransition(); const { toast } = useToast();
  function issue() { if (!subject) return; startTransition(async () => { try { setLink(await postTelegram({ subjectId: subject.id }) as { startUrl: string; expiresAt: string }); } catch (error) { toast({ title: "تعذر بدء الربط", description: errorMessage(error instanceof Error ? error.message : undefined), variant: "destructive" }); } }); }
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setSubject(null); setLink(null); } }}>
    <DialogTrigger asChild><Button disabled={!enabled} className="gap-2"><Link2 className="h-4 w-4" />ربط قناة</Button></DialogTrigger>
    <DialogContent dir="rtl" className="sm:max-w-xl"><DialogHeader><DialogTitle>ربط قناة تيليجرام خاصة</DialogTitle><DialogDescription>وثّق هوية الإدارة عبر البوت، ثم أضف البوت إلى قناة خاصة كمسؤول بصلاحيتي دعوة المستخدمين وتقييد الأعضاء.</DialogDescription></DialogHeader>
      <div className="space-y-4"><div className="space-y-2"><Label>المادة</Label><AsyncCombobox value={subject} onChange={(value) => { setSubject(value); setLink(null); }} fetcher={searchPaymentSubjectsAction} disablePortal placeholder="ابحث عن مادة جامعية سعودية" /></div>
      {!link ? <Button type="button" onClick={issue} disabled={!subject || pending} className="w-full">{pending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}توثيق هوية الإدارة</Button> : <Alert><AlertDescription className="space-y-3"><p>الرابط صالح لمرة واحدة حتى {formatDate(link.expiresAt)}. بعد فتحه أضف البوت إلى القناة.</p><Button asChild><a href={link.startUrl} target="_blank" rel="noreferrer">فتح البوت <ExternalLink className="mr-2 h-4 w-4" /></a></Button></AlertDescription></Alert>}</div>
    </DialogContent></Dialog>;
}

function MutationDialog({ channel, mode, children }: { channel: TelegramChannelRow; mode: "enable" | "disable" | "mass_remove" | "disconnect"; children: ReactNode }) {
  const [reason, setReason] = useState(""); const [confirmation, setConfirmation] = useState(""); const [pending, startTransition] = useTransition(); const router = useRouter(); const { toast } = useToast(); const reasonId = useId(); const confirmationId = useId();
  const dangerous = mode === "mass_remove" || mode === "disconnect";
  const required = mode === "mass_remove" ? "REMOVE ALL TELEGRAM MEMBERS" : mode === "disconnect" ? "DISCONNECT TELEGRAM CHANNEL" : "";
  const title = { enable: "تفعيل الانضمامات", disable: "تعطيل الانضمامات", mass_remove: "إزالة جميع الأعضاء", disconnect: "فصل القناة" }[mode];
  function submit() { startTransition(async () => { try { const common = { channelId: channel.id, expectedUpdatedAt: channel.updatedAt, idempotencyKey: crypto.randomUUID(), reason }; await postTelegram(mode === "enable" || mode === "disable" ? { action: "set_enabled", enabled: mode === "enable", ...common } : { action: mode, confirmation: required, ...common }); toast({ title: "تم اعتماد العملية" }); router.refresh(); } catch (error) { toast({ title: "تعذر تنفيذ العملية", description: errorMessage(error instanceof Error ? error.message : undefined), variant: "destructive" }); } }); }
  return <AlertDialog><AlertDialogTrigger asChild>{children}</AlertDialogTrigger><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{mode === "disable" ? "لن تُحذف العضويات القائمة، لكن ستتوقف عمليات الربط الجديدة." : mode === "mass_remove" ? "ستُنشأ مهام إزالة مستقلة قابلة لإعادة المحاولة، ولن تتغير الاستحقاقات." : mode === "disconnect" ? "لا يمكن الفصل مع عضويات غير معالجة أو مهام معلقة." : "سيُسمح بإنشاء روابط انضمام جديدة."}</AlertDialogDescription></AlertDialogHeader>
    <div className="space-y-3"><Label htmlFor={reasonId}>السبب الداخلي</Label><Textarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} />{dangerous ? <><Label htmlFor={confirmationId}>اكتب للتأكيد</Label><Input id={confirmationId} dir="ltr" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={required} /></> : null}</div>
    <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={submit} disabled={reason.trim().length < 5 || (dangerous && confirmation !== required) || pending} className={dangerous ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>{pending ? "جار التنفيذ..." : title}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}

function DetailsDialog({ channel }: { channel: TelegramChannelRow }) {
  const [open, setOpen] = useState(false); const [detail, setDetail] = useState<Detail | null>(null); const [page, setPage] = useState(1); const [query, setQuery] = useState(""); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(false); const [pending, startTransition] = useTransition(); const { toast } = useToast();
  const load = useCallback(async () => { setLoading(true); try { const params = new URLSearchParams({ channelId: channel.id, page: String(page) }); if (query) params.set("query", query); const response = await fetch(API + "?" + params, { cache: "no-store" }); const body = await response.json().catch(() => null) as { data?: Detail; error?: string } | null; if (!response.ok || !body?.data) throw new Error(body?.error ?? "telegram_unavailable"); setDetail(body.data); } catch (error) { toast({ title: "تعذر تحميل التفاصيل", description: errorMessage(error instanceof Error ? error.message : undefined), variant: "destructive" }); } finally { setLoading(false); } }, [channel.id, page, query, toast]);
  useEffect(() => { if (open) void load(); }, [load, open]);
  function retry(id: string) { startTransition(async () => { try { await postTelegram({ action: "retry_membership", membershipId: id, idempotencyKey: crypto.randomUUID(), reason: "Manual membership synchronization retry" }); toast({ title: "أضيفت محاولة المزامنة" }); await load(); } catch (error) { toast({ title: "تعذر إضافة المحاولة", description: errorMessage(error instanceof Error ? error.message : undefined), variant: "destructive" }); } }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm">التفاصيل</Button></DialogTrigger><DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{channel.subjectName}</DialogTitle><DialogDescription>{channel.title} · العضويات والمهام والتدقيق الأخير</DialogDescription></DialogHeader>
    {loading && !detail ? <p className="py-10 text-center text-muted-foreground">جار التحميل...</p> : null}{detail ? <div className="space-y-6">
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="البريد أو supportReference أو Telegram ID" aria-label="البحث في العضويات" /><Button type="submit" variant="outline" size="icon" aria-label="بحث"><Search className="h-4 w-4" aria-hidden /></Button></form>
      <AdminTableShell minWidth="min-w-[850px]"><Table><TableHeader><TableRow><TableHead>الهوية</TableHead><TableHead>المصدر</TableHead><TableHead>الحالة</TableHead><TableHead>الانتهاء</TableHead><TableHead>الخطأ</TableHead><TableHead className="text-left">الإجراء</TableHead></TableRow></TableHeader><TableBody>{detail.memberships.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center">لا توجد عضويات</TableCell></TableRow> : detail.memberships.map((item) => <TableRow key={item.id}><TableCell><div dir="ltr">{maskedId(item.telegramUserId)}</div><div className="text-xs text-muted-foreground">{item.user?.email ?? item.codeAccessGrant?.code.supportReference ?? "ضيف"}</div></TableCell><TableCell>{item.principalType === "account" ? "حساب" : "Grant ضيف"}</TableCell><TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell><TableCell>{formatDate(item.accessExpiresAt)}</TableCell><TableCell className="text-xs">{item.lastErrorCode ?? "-"}</TableCell><TableCell className="text-left"><Button variant="ghost" size="sm" disabled={pending} onClick={() => retry(item.id)}><RefreshCw className="h-4 w-4" aria-hidden /><span className="sr-only">إعادة المزامنة</span></Button></TableCell></TableRow>)}</TableBody></Table><div className="flex justify-between border-t p-3 text-sm"><span>صفحة {detail.pagination.page} من {detail.pagination.totalPages} · {detail.pagination.total}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>السابق</Button><Button variant="outline" size="sm" disabled={page >= detail.pagination.totalPages} onClick={() => setPage((v) => v + 1)}>التالي</Button></div></div></AdminTableShell>
      <div className="grid gap-4 lg:grid-cols-2"><section><h3 className="mb-2 text-sm font-semibold">آخر المهام</h3><div className="divide-y border-y text-sm">{detail.jobs.length ? detail.jobs.map((job) => <div key={job.id} className="flex justify-between py-2"><span>{job.type}</span><span className="text-xs text-muted-foreground">{job.status} · {job.attempts}</span></div>) : <p className="py-3 text-muted-foreground">لا توجد مهام.</p>}</div></section><section><h3 className="mb-2 text-sm font-semibold">آخر أحداث التدقيق</h3><div className="divide-y border-y text-sm">{detail.events.length ? detail.events.map((event) => <div key={event.id} className="py-2"><div>{event.eventType}</div><div className="text-xs text-muted-foreground">{event.actor?.email ?? event.actorType} · {formatDate(event.createdAt)}</div></div>) : <p className="py-3 text-muted-foreground">لا توجد أحداث.</p>}</div></section></div>
    </div> : null}
  </DialogContent></Dialog>;
}

export function TelegramAdmin({ data }: { data: TelegramAdminData }) {
  const [search, setSearch] = useState(data.query); const [verifying, startVerify] = useTransition(); const router = useRouter(); const setParams = useTableParams(); const { toast } = useToast();
  function verify(id: string) { startVerify(async () => { try { await postTelegram({ action: "verify_channel", channelId: id, idempotencyKey: crypto.randomUUID() }); toast({ title: "تم تحديث حالة القناة" }); router.refresh(); } catch (error) { toast({ title: "فشل فحص القناة", description: errorMessage(error instanceof Error ? error.message : undefined), variant: "destructive" }); } }); }
  return <div className="space-y-4">{!data.runtimeEnabled ? <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertDescription>Telegram Runtime مغلق أو إعداداته غير مكتملة. القراءة متاحة، أما الربط والإجراءات الخارجية فمغلقة.</AlertDescription></Alert> : null}
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div className="flex flex-1 flex-col gap-3 sm:flex-row"><form className="flex w-full max-w-xl gap-2" onSubmit={(event) => { event.preventDefault(); setParams({ telegramQuery: search.trim(), telegramPage: 1, tab: "telegram" }); }}><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="المادة أو التخصص أو الكلية أو الجامعة" aria-label="البحث في قنوات تيليجرام" /><Button type="submit" variant="outline" size="icon" aria-label="بحث"><Search className="h-4 w-4" aria-hidden /></Button></form><Select value={data.status} onValueChange={(value) => setParams({ telegramStatus: value, telegramPage: 1, tab: "telegram" })}><SelectTrigger className="w-full sm:w-48" aria-label="تصفية حالة القنوات"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل القنوات</SelectItem><SelectItem value="enabled">الانضمام مفعل</SelectItem><SelectItem value="disabled">الانضمام معطل</SelectItem><SelectItem value="connected">متصلة</SelectItem><SelectItem value="degraded">تحتاج انتباهًا</SelectItem><SelectItem value="disconnected">مفصولة</SelectItem></SelectContent></Select></div><ConnectDialog enabled={data.runtimeEnabled} /></div>
    <AdminTableShell minWidth="min-w-[1100px]"><Table><TableHeader><TableRow><TableHead>المادة</TableHead><TableHead>القناة</TableHead><TableHead>الصحة</TableHead><TableHead>العضويات</TableHead><TableHead>المهام</TableHead><TableHead>آخر تحقق</TableHead><TableHead className="text-left">الإجراءات</TableHead></TableRow></TableHeader><TableBody>{data.channels.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center">لا توجد قنوات مطابقة</TableCell></TableRow> : data.channels.map((channel) => <TableRow key={channel.id}><TableCell><div className="font-medium">{channel.subjectName}</div><div className="text-xs text-muted-foreground">{[channel.universityName, channel.collegeName, channel.majorName].filter(Boolean).join(" / ")}</div></TableCell><TableCell><div>{channel.title}</div><Badge variant={channel.isEnabled ? "default" : "secondary"}>{channel.isEnabled ? "مفعل" : "معطل"}</Badge></TableCell><TableCell><Badge variant={channel.status === "connected" ? "default" : "secondary"}>{channel.status}</Badge><div className="text-xs text-muted-foreground">دعوة {channel.botCanInviteUsers ? "نعم" : "لا"} · تقييد {channel.botCanRestrictMembers ? "نعم" : "لا"}</div></TableCell><TableCell>{channel.memberships.active} / {channel.memberships.total}{channel.memberships.attention ? <div className="text-xs text-destructive">{channel.memberships.attention} تحتاج متابعة</div> : null}</TableCell><TableCell>{channel.pendingJobs}</TableCell><TableCell>{formatDate(channel.lastHealthCheckedAt)}</TableCell><TableCell className="text-left"><div className="flex flex-wrap justify-end gap-1"><DetailsDialog channel={channel} /><Button variant="ghost" size="sm" disabled={!data.runtimeEnabled || verifying} onClick={() => verify(channel.id)} title="فحص الصحة" aria-label="فحص صحة القناة"><Activity className="h-4 w-4" aria-hidden /></Button><MutationDialog channel={channel} mode={channel.isEnabled ? "disable" : "enable"}><Button variant="ghost" size="sm" disabled={!data.runtimeEnabled} title={channel.isEnabled ? "تعطيل الانضمامات" : "تفعيل الانضمامات"} aria-label={channel.isEnabled ? "تعطيل الانضمامات" : "تفعيل الانضمامات"}><Power className="h-4 w-4" aria-hidden /></Button></MutationDialog><MutationDialog channel={channel} mode="mass_remove"><Button variant="ghost" size="sm" disabled={!data.runtimeEnabled || channel.isEnabled || channel.memberships.total === 0} title="إزالة جميع الأعضاء" aria-label="إزالة جميع أعضاء القناة"><Users className="h-4 w-4 text-destructive" aria-hidden /></Button></MutationDialog><MutationDialog channel={channel} mode="disconnect"><Button variant="ghost" size="sm" disabled={channel.isEnabled || channel.memberships.total > 0 || channel.pendingJobs > 0 || !data.runtimeEnabled} title="فصل القناة" aria-label="فصل القناة"><Unlink className="h-4 w-4 text-destructive" aria-hidden /></Button></MutationDialog></div></TableCell></TableRow>)}</TableBody></Table><div className="flex justify-between border-t p-3 text-sm"><span>صفحة {data.pagination.page} من {data.pagination.totalPages} · {data.pagination.total}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={data.pagination.page <= 1} onClick={() => setParams({ telegramPage: data.pagination.page - 1, tab: "telegram" })}>السابق</Button><Button variant="outline" size="sm" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setParams({ telegramPage: data.pagination.page + 1, tab: "telegram" })}>التالي</Button></div></div></AdminTableShell>
  </div>;
}