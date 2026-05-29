
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc, updateDoc, addDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Package,
  MessageSquare,
  Trash2,
  Loader2,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Flag,
  UserX,
  UserCheck,
  Plus,
  Pencil,
  CreditCard,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  ExternalLink,
  Ban,
  User as UserIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS, arSA, fr } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { type Listing } from '@/components/listings/ListingCard';
import { ListingDetailView } from '@/components/listings/ListingDetailView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useLanguage } from '@/context/LanguageContext';

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalRevenueDA: number;
  totalReports: number;
}

interface SubscriptionPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export default function AdminDashboard() {
  const { t, language, isRTL } = useLanguage();
  const dateLocale = language === 'ar' ? arSA : language === 'fr' ? fr : enUS;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalListings: 0, totalRevenueDA: 0, totalReports: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<Partial<SubscriptionPackage>>({ name: '', credits: 1, price: 100 });
  const [savingPackage, setSavingPackage] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      const token = sessionStorage.getItem('admin_token');
      if (token !== 'authorized_dz_admin') {
        router.push('/admin/login');
        return;
      }
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }
      const profileSnap = await getDoc(doc(db, 'userProfiles', user.uid));
      if (profileSnap.exists() && profileSnap.data().isAdmin === true) {
        fetchData();
        listenToRevenue();
      } else {
        router.push('/');
      }
    };
    checkAccess();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'userProfiles'), limit(100)));
      const listingsSnap = await getDocs(query(collection(db, 'listings'), limit(100)));
      const reportsSnap = await getDocs(query(collection(db, 'reports'), limit(100)));
      const packagesSnap = await getDocs(collection(db, 'subscriptionPackages'));

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setListings(listingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubscriptionPackages(packagesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionPackage)));

      setStats(prev => ({
        ...prev,
        totalUsers: usersSnap.size,
        totalListings: listingsSnap.size,
        totalReports: reportsSnap.size,
      }));
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('error') });
    } finally {
      setLoading(false);
    }
  };

  const listenToRevenue = () => {
    return onSnapshot(collection(db, 'revenue'), (snap) => {
      const revData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sortedRev = revData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
      setRevenueHistory(sortedRev);
      const total = revData.reduce((sum, r: any) => sum + (r.amount || 0), 0);
      setStats(prev => ({ ...prev, totalRevenueDA: total }));
    });
  };

  const handleDelete = async (coll: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, coll, id));
      toast({ title: t('success') });
      fetchData();
    } catch (err) { toast({ variant: 'destructive', title: t('failed') }); }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateDoc(doc(db, 'userProfiles', userId), { isBanned: !currentStatus });
      toast({ title: t('success') });
      fetchData();
    } catch (err) { toast({ variant: 'destructive', title: t('failed') }); }
  };

  const handleSavePackage = async () => {
    setSavingPackage(true);
    try {
      if (currentPackage.id) {
        await updateDoc(doc(db, 'subscriptionPackages', currentPackage.id), currentPackage);
      } else {
        await addDoc(collection(db, 'subscriptionPackages'), currentPackage);
      }
      setIsPackageDialogOpen(false);
      fetchData();
    } catch (err) { toast({ variant: 'destructive', title: t('failed') }); }
    finally { setSavingPackage(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={40} /></div>;

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-start">
          <div><h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="text-primary" /> {t('admin_center')}</h1><p className="text-sm text-muted-foreground">{t('admin_subtitle')}</p></div>
          <Button variant="outline" className="rounded-xl" onClick={() => { sessionStorage.removeItem('admin_token'); router.push('/admin/login'); }}>{t('logout')}</Button>
        </div>

        <Card className="rounded-[2rem] bg-primary text-primary-foreground text-start">
          <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8"><div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><TrendingUp size={32} /></div><div><p className="text-sm opacity-80 uppercase font-black">{t('total_platform_revenue')}</p><p className="text-4xl md:text-5xl font-black">{stats.totalRevenueDA.toLocaleString()} <span className="text-xl font-medium opacity-60">{t('price_da')}</span></p></div></div>
            <div className="flex items-center gap-3 bg-white/10 px-6 py-4 rounded-2xl"><div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" /><p className="font-bold text-sm">{t('revenue_tracking_active')}</p></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-start">
          <Card className="rounded-2xl p-6 flex items-center gap-4"><div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center"><Users className="text-blue-500" /></div><div><p className="text-xs text-muted-foreground font-bold">{t('tab_users')}</p><p className="text-2xl font-black">{stats.totalUsers}</p></div></Card>
          <Card className="rounded-2xl p-6 flex items-center gap-4"><div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center"><Package className="text-emerald-600" /></div><div><p className="text-xs text-muted-foreground font-bold">{t('tab_listings')}</p><p className="text-2xl font-black">{stats.totalListings}</p></div></Card>
          <Card className="rounded-2xl p-6 flex items-center gap-4"><div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center"><Flag className="text-destructive" /></div><div><p className="text-xs text-muted-foreground font-bold">{t('tab_reports')}</p><p className="text-2xl font-black">{stats.totalReports}</p></div></Card>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <div className="flex justify-center"><TabsList className="bg-card h-14 p-1 rounded-2xl shadow-sm"><TabsTrigger value="reports" className="rounded-xl px-8">{t('tab_reports')}</TabsTrigger><TabsTrigger value="users" className="rounded-xl px-8">{t('tab_users')}</TabsTrigger><TabsTrigger value="listings" className="rounded-xl px-8">{t('tab_listings')}</TabsTrigger><TabsTrigger value="subs" className="rounded-xl px-8">{t('tab_subs')}</TabsTrigger><TabsTrigger value="revenue" className="rounded-xl px-8">{t('tab_revenue')}</TabsTrigger></TabsList></div>

          <div className="relative max-w-md mx-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} /><Input placeholder={t('filter_view_placeholder')} className="px-10 h-12 rounded-xl text-start" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

          <TabsContent value="reports" className="space-y-4">
            {reports.map(r => {
              const targetUser = users.find(u => u.id === r.targetUserId);
              return (
                <Card key={r.id} className="rounded-2xl p-6 space-y-4 text-start">
                  <div className="flex justify-between items-start"><div className="flex gap-2"><Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'}>{r.status?.toUpperCase() || 'PENDING'}</Badge><Badge variant="outline" className="text-primary border-primary/20"><ShieldAlert size={10} className="mr-1" /> {t('admin_only_view')}</Badge></div><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => handleDelete('reports', r.id)}><Trash2 size={16} /></Button><Button size="sm" className="rounded-xl gap-2 font-bold" onClick={() => updateDoc(doc(db, 'reports', r.id), { status: 'resolved' })}><CheckCircle2 size={14} /> {t('resolve')}</Button></div></div>
                  <div className="space-y-2"><p className="font-black text-lg flex items-center gap-2"><Flag size={20} className="text-destructive" /> {r.type?.toUpperCase()}</p><p className="text-sm bg-muted/50 p-4 rounded-xl italic leading-relaxed border-l-4 border-destructive/30">"{r.reason}"</p></div>
                  <div className="flex gap-2">{r.conversationId && <Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push(`/chat/${r.conversationId}`)}><MessageSquare size={14} className="mr-2" /> {t('view_conversation')}</Button>}{r.targetUserId && <><Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push(`/profile/${r.targetUserId}`)}><UserIcon size={14} className="mr-2" /> {t('view_profile')}</Button><Button variant={targetUser?.isBanned ? "secondary" : "destructive"} size="sm" className="rounded-xl" onClick={() => handleToggleBan(r.targetUserId, !!targetUser?.isBanned)}>{targetUser?.isBanned ? <UserCheck size={14} className="mr-2" /> : <Ban size={14} className="mr-2" />}{targetUser?.isBanned ? t('unban_user') : t('ban_permanently')}</Button></>}</div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="users" className="grid gap-3">
            {users.filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
              <Card key={u.id} className={cn("rounded-2xl p-4 flex items-center justify-between text-start", u.isBanned && "opacity-60")}>
                <Link href={`/profile/${u.id}`} className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black">{u.username?.charAt(0).toUpperCase()}</div>
                  <div><p className="font-black text-sm flex items-center gap-2">{u.username} {u.isVerified && <CheckCircle2 size={14} className="text-primary" />}{u.isBanned && <Badge variant="destructive" className="h-4 text-[8px]">{t('status')}: BANNED</Badge>}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                </Link>
                <Button variant="ghost" size="icon" onClick={(e) => handleToggleBan(u.id, u.isBanned, e)}>{u.isBanned ? <UserCheck size={18} /> : <UserX size={18} />}</Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="listings" className="grid gap-3">
            {listings.filter(l => l.title?.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (
              <Card key={l.id} className="rounded-2xl p-4 flex items-center justify-between text-start cursor-pointer hover:bg-accent" onClick={() => { setSelectedListing(l); setIsDetailOpen(true); }}>
                <div><p className="font-black truncate">{l.title}</p><p className="text-[10px] text-muted-foreground uppercase">{t(l.type)} • {l.city}</p></div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => handleDelete('listings', l.id, e)}><Trash2 size={18} /></Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="subs" className="space-y-4 text-start">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{t('tab_subs')}</h3><Button onClick={() => { setCurrentPackage({ name: '', credits: 1, price: 100 }); setIsPackageDialogOpen(true); }} className="rounded-xl gap-2"><Plus size={18} /> {t('add_package')}</Button></div>
            {subscriptionPackages.map(pkg => (
              <Card key={pkg.id} className="rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600"><CreditCard size={24} /></div><div><p className="font-black">{pkg.name}</p><p className="text-xs text-muted-foreground font-bold">{pkg.credits} {t('currency_da')} • {pkg.price} {t('price_da')}</p></div></div>
                <div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => { setCurrentPackage(pkg); setIsPackageDialogOpen(true); }}><Pencil size={18} /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete('subscriptionPackages', pkg.id)} className="text-destructive"><Trash2 size={18} /></Button></div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="revenue" className="grid gap-3 text-start">
            {revenueHistory.map(t_rev => (
              <Card key={t_rev.id} className="rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1"><div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600"><ShoppingBag size={24} /></div><div><p className="font-bold text-sm">{t_rev.packageName}</p><p className="text-[10px] text-muted-foreground uppercase">{t('buyer')}: {t_rev.buyerName || 'User'} • {t_rev.createdAt ? format(t_rev.createdAt.toDate(), 'PPpp', { locale: dateLocale }) : '...'}</p></div></div>
                <div className="font-black text-emerald-600 text-lg">+{t_rev.amount?.toLocaleString()} {t('price_da')}</div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <div className={cn("fixed bottom-8 z-50", isRTL ? "left-8" : "right-8")}><Link href="/"><Button className="rounded-full h-14 w-14 shadow-2xl"><RefreshCw size={24} /></Button></Link></div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}><DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl"><DialogHeader className="p-6 text-start"><DialogTitle className="text-2xl font-bold">{t('listing_details')}</DialogTitle></DialogHeader><div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">{selectedListing && <ListingDetailView listing={selectedListing as any} />}</div></DialogContent></Dialog>

      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}><DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
        <DialogHeader className="text-start"><DialogTitle>{currentPackage.id ? t('edit_package') : t('add_package')}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4 text-start"><div className="space-y-2"><Label>{t('package_name')}</Label><Input value={currentPackage.name} onChange={(e) => setCurrentPackage({...currentPackage, name: e.target.value})} className="rounded-xl" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>{t('credits_label')}</Label><Input type="number" value={currentPackage.credits} onChange={(e) => setCurrentPackage({...currentPackage, credits: Number(e.target.value)})} className="rounded-xl" /></div><div className="space-y-2"><Label>{t('price_da_label')}</Label><Input type="number" value={currentPackage.price} onChange={(e) => setCurrentPackage({...currentPackage, price: Number(e.target.value)})} className="rounded-xl" /></div></div></div>
        <DialogFooter><Button onClick={handleSavePackage} disabled={savingPackage} className="w-full rounded-xl">{savingPackage ? <Loader2 className="animate-spin" /> : t('save_package')}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
