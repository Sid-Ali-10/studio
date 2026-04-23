
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
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
  Banknote,
  History,
  Settings,
  RefreshCw,
  Save,
  Copy,
  Check,
  Flag,
  UserX,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalConvos: number;
  totalCommission: number;
  totalReports: number;
}

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdminInDb, setIsAdminInDb] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalListings: 0, totalConvos: 0, totalCommission: 0, totalReports: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [convos, setConvos] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [platformCommission, setPlatformCommission] = useState(1000);
  const [savingSettings, setSavingSettings] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      const token = sessionStorage.getItem('admin_token');
      if (token !== 'authorized_dz_admin') {
        router.push('/admin/login');
        return;
      }

      setIsAuthorized(true);

      try {
        const user = auth.currentUser;
        if (!user) {
          router.push('/login');
          return;
        }

        const profileSnap = await getDoc(doc(db, 'userProfiles', user.uid));
        if (profileSnap.exists() && profileSnap.data().isAdmin === true) {
          setIsAdminInDb(true);
          fetchData(user.uid);
          fetchSettings();
        } else {
          setIsAdminInDb(false);
          setLoading(false);
        }
      } catch (err) {
        console.error('Access verification failed', err);
        setIsAdminInDb(false);
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'config'));
      if (settingsSnap.exists()) {
        setPlatformCommission(settingsSnap.data().defaultCommission || 1000);
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(
        doc(db, 'settings', 'config'),
        {
          defaultCommission: Number(platformCommission),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: 'Settings Saved', description: 'Global commission updated.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchData = async (adminUid: string) => {
    setLoading(true);

    try {
      const [usersSnap, listingsSnap, convosSnap, reportsSnap] = await Promise.all([
        getDocs(collection(db, 'userProfiles')),
        getDocs(collection(db, 'listings')),
        getDocs(collection(db, 'conversations')),
        getDocs(collection(db, 'reports')),
      ]);

      const usersData = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(usersData);

      const listingsData = listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setListings(listingsData);

      const convosData = convosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConvos(convosData);

      const reportsData = reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(reportsData);

      const transSnap = await getDocs(collection(db, 'userProfiles', adminUid, 'transactions'));
      const transData = transSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllTransactions(transData);

      const commSum = transData
        .filter((t) => t.type === 'commission')
        .reduce((sum, t) => sum + t.amount, 0);

      setStats({
        totalUsers: usersSnap.size,
        totalListings: listingsSnap.size,
        totalConvos: convosSnap.size,
        totalCommission: commSum,
        totalReports: reportsSnap.size,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Data Load Error', description: 'Could not retrieve platform statistics.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!confirm(`Are you sure you want to permanently delete this ${coll.slice(0, -1)}?`)) return;
    setProcessingAction(`delete-${id}`);

    try {
      await deleteDoc(doc(db, coll, id));
      
      if (coll === 'listings') setListings((prev) => prev.filter((l) => l.id !== id));
      if (coll === 'conversations') setConvos((prev) => prev.filter((c) => c.id !== id));
      if (coll === 'reports') setReports((prev) => prev.filter((r) => r.id !== id));

      toast({ title: 'Success', description: 'Resource removed successfully.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: err.message });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolved' | 'ignored') => {
    setProcessingAction(`report-${reportId}`);
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: action,
        updatedAt: serverTimestamp()
      });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: action } : r));
      toast({ title: 'Report Updated', description: `Report marked as ${action}.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Update Failed' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    setProcessingAction(`ban-${userId}`);
    try {
      await updateDoc(doc(db, 'userProfiles', userId), {
        isBanned: !currentBanned,
        updatedAt: serverTimestamp()
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !currentBanned } : u));
      toast({ 
        title: !currentBanned ? 'User Banned' : 'User Unbanned', 
        description: `Access for this user has been ${!currentBanned ? 'restricted' : 'restored'}.` 
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    toast({
      title: 'Email Copied',
      description: `${email} has been copied to your clipboard.`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin" size={48} />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  if (isAdminInDb === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle size={40} className="text-destructive mb-4" />
        <h1>Unauthorized</h1>
        <Button onClick={() => router.push('/admin/login')} className="mt-4 rounded-xl transition-all active:scale-95">
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldAlert className="text-primary" /> Admin Command Center
            </h1>
            <p className="text-muted-foreground">Monitor platform activity and manage global settings.</p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl transition-all duration-200 hover:bg-destructive hover:text-white active:scale-95"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <Users className="text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Users</p>
                <p className="text-xl font-bold">{stats.totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <Package className="text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Listings</p>
                <p className="text-xl font-bold">{stats.totalListings}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <MessageSquare className="text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Chats</p>
                <p className="text-xl font-bold">{stats.totalConvos}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <Flag className="text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Reports</p>
                <p className="text-xl font-bold">{stats.totalReports}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-primary text-primary-foreground">
            <CardContent className="p-6 flex items-center gap-4">
              <Banknote />
              <div>
                <p className="text-xs opacity-70 uppercase">Commissions</p>
                <p className="text-xl font-bold">{stats.totalCommission} DA</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="rounded-2xl h-14 w-full md:w-auto overflow-x-auto bg-card p-1 shadow-sm">
            <TabsTrigger
              value="reports"
              className="rounded-xl px-8 transition-all duration-200 data-[state=active]:shadow-md"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-xl px-8 transition-all duration-200 data-[state=active]:shadow-md"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="listings"
              className="rounded-xl px-8 transition-all duration-200 data-[state=active]:shadow-md"
            >
              Listings
            </TabsTrigger>
            <TabsTrigger
              value="convos"
              className="rounded-xl px-8 transition-all duration-200 data-[state=active]:shadow-md"
            >
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="rounded-xl px-8 transition-all duration-200 data-[state=active]:shadow-md"
            >
              Revenue Log
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-xl px-8 transition-all duration-200 data-[state=active]:shadow-md"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Filter list..."
              className="pl-10 h-12 rounded-xl transition-all duration-200 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <TabsContent value="reports">
            <div className="grid gap-4">
              {reports.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-3xl">
                  <Flag className="mx-auto text-muted-foreground mb-4 opacity-20" size={48} />
                  <p className="text-muted-foreground">No reports currently pending review.</p>
                </div>
              ) : (
                reports.map((r) => (
                  <Card key={r.id} className="rounded-2xl border-none shadow-sm overflow-hidden animate-in fade-in">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'} className="rounded-lg">
                            {r.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {r.createdAt ? format(r.createdAt.toDate(), 'PPpp') : 'Recent'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full text-muted-foreground hover:bg-muted"
                            onClick={() => handleReportAction(r.id, 'ignored')}
                            title="Ignore Report"
                          >
                            <Trash2 size={16} />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-xl h-8 gap-1"
                            onClick={() => handleReportAction(r.id, 'resolved')}
                          >
                            <CheckCircle2 size={14} /> Resolve
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-bold text-lg flex items-center gap-2">
                          {r.type === 'scam' ? '🚨' : '⚠️'} {r.type.toUpperCase()} Report
                        </p>
                        <p className="text-sm bg-muted/50 p-3 rounded-xl italic">"{r.reason}"</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-muted-foreground font-bold uppercase">Reporter</p>
                          <p className="font-medium truncate">{users.find(u => u.id === r.reporterId)?.username || 'Unknown User'}</p>
                        </div>
                        {r.targetUserId && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-bold uppercase">Targeted User</p>
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{users.find(u => u.id === r.targetUserId)?.username || 'User'}</p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-[10px] rounded-lg text-destructive hover:bg-destructive/10"
                                onClick={() => handleToggleBan(r.targetUserId, users.find(u => u.id === r.targetUserId)?.isBanned)}
                              >
                                {users.find(u => u.id === r.targetUserId)?.isBanned ? 'Unban' : 'Ban User'}
                              </Button>
                            </div>
                          </div>
                        )}
                        {r.conversationId && (
                          <div className="col-span-full pt-2">
                            <Link href={`/chat/${r.conversationId}`}>
                              <Button variant="outline" className="w-full rounded-xl gap-2 h-10 border-primary/20 hover:bg-primary/10">
                                <ExternalLink size={16} /> Review Conversation
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="grid gap-3">
              {users
                .filter((u) => u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((u) => (
                  <Card
                    key={u.id}
                    className={cn(
                      "rounded-2xl border-none shadow-sm p-4 flex items-center justify-between hover:bg-muted/30 transition-all duration-200",
                      u.isBanned && "opacity-60 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        u.isBanned ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"
                      )}>
                        {u.username?.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold flex items-center gap-2">
                          {u.username} 
                          {u.isVerified && <CheckCircle2 size={12} className="text-accent" />}
                          {u.isBanned && <Badge variant="destructive" className="h-4 text-[8px] px-1">BANNED</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "rounded-full transition-all duration-200 active:scale-90",
                          u.isBanned ? "text-accent" : "text-destructive hover:bg-destructive/10"
                        )}
                        onClick={() => handleToggleBan(u.id, u.isBanned)}
                        title={u.isBanned ? "Unban User" : "Ban User"}
                      >
                        {u.isBanned ? <UserCheck size={18} /> : <UserX size={18} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 active:scale-90"
                        onClick={() => handleCopyEmail(u.email, u.id)}
                        title="Copy Email Address"
                      >
                        {copiedId === u.id ? <Check size={18} className="text-accent" /> : <Copy size={18} />}
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="listings">
            <div className="grid gap-3">
              {listings
                .filter((l) => l.title?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((l) => (
                  <Card
                    key={l.id}
                    className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between hover:bg-muted/30 transition-all duration-200"
                  >
                    <div>
                      <p className="font-bold">{l.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.type.toUpperCase()} • {l.city} → {l.destination}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-destructive hover:text-white hover:bg-destructive transition-all duration-200 active:scale-90"
                      onClick={() => handleDelete('listings', l.id)}
                      disabled={processingAction === `delete-${l.id}`}
                    >
                      {processingAction === `delete-${l.id}` ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={18} />}
                    </Button>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="convos">
            <div className="grid gap-3">
              {convos.map((c) => (
                <Card
                  key={c.id}
                  className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between hover:bg-muted/30 transition-all duration-200"
                >
                  <div>
                    <p className="font-bold text-sm">{c.listingTitle || 'Private Chat'}</p>
                    <p className="text-xs text-muted-foreground">ID: {c.id.slice(0, 10)}...</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/chat/${c.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-primary hover:bg-primary/10 transition-all duration-200 active:scale-90"
                      >
                        <Eye size={18} />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-destructive hover:text-white hover:bg-destructive transition-all duration-200 active:scale-90"
                      onClick={() => handleDelete('conversations', c.id)}
                      disabled={processingAction === `delete-${c.id}`}
                    >
                      {processingAction === `delete-${c.id}` ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={18} />}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="grid gap-3">
              {allTransactions
                .filter((t) => t.type === 'commission')
                .map((t) => (
                  <Card
                    key={t.id}
                    className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between hover:bg-muted/30 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                        <History size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.createdAt ? format(t.createdAt.toDate(), 'PPPp') : 'Unknown Date'}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-accent">+{t.amount} DA</div>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} /> Platform Configuration
                </CardTitle>
                <CardDescription>Adjust global parameters that affect all users.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Default Traveler Commission (DA)</Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="commission"
                        type="number"
                        className="pl-10 h-12 rounded-xl transition-all duration-200 focus:ring-primary/20"
                        value={platformCommission}
                        onChange={(e) => setPlatformCommission(Number(e.target.value))}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      This amount is deducted from travelers for every completed deal.
                    </p>
                  </div>

                  <Button
                    className="w-full h-12 rounded-xl font-bold gap-2 transition-all duration-200 active:scale-[0.98]"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                  >
                    {savingSettings ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Save size={18} /> Save Global Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
