import { useState, useEffect } from 'react';
import {
  Home, Users, Plus, Search, Download, TrendingUp,
  IndianRupee, Clock, AlertTriangle, X, Moon, Sun,
  Phone, FileText, ChevronRight, ArrowUpRight, ArrowDownRight, PieChart,
  Settings, Trash2, Edit3, ShieldAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, differenceInDays, addMonths, isPast, isToday } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  date: string;
  note?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  principal: number;
  advanceInterestPaid: number;
  interestRate: number;
  interestType: 'daily' | 'monthly';
  startDate: string;
  dueDate: string;
  payments: Payment[];
  createdAt: string;
}

type Theme = 'light' | 'dark';
type Screen = 'home' | 'customers' | 'admin' | 'reports' | 'settings';

const generateId = () => Math.random().toString(36).slice(2, 9);
const formatCurrency = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const calculateInterest = (customer: Customer) => {
  const start = new Date(customer.startDate);
  const due = new Date(customer.dueDate);
  const now = new Date();
  const daysElapsed = Math.max(0, differenceInDays(now, start));
  const totalDays = Math.max(1, differenceInDays(due, start));
  
  let accruedInterest = 0;
  if (customer.interestType === 'daily') {
    accruedInterest = customer.principal * (customer.interestRate / 100) * daysElapsed;
  } else {
    const monthsElapsed = daysElapsed / 30;
    accruedInterest = customer.principal * (customer.interestRate / 100) * monthsElapsed;
  }
  
  let totalExpectedInterest = 0;
  if (customer.interestType === 'daily') {
    totalExpectedInterest = customer.principal * (customer.interestRate / 100) * totalDays;
  } else {
    const totalMonths = totalDays / 30;
    totalExpectedInterest = customer.principal * (customer.interestRate / 100) * totalMonths;
  }
  
  const advanceInterest = customer.advanceInterestPaid || 0;
  const interestPaidFromPayments = customer.payments.reduce((sum, p) => sum + p.interestAmount, 0);
  const totalInterestPaid = advanceInterest + interestPaidFromPayments;
  const principalPaid = customer.payments.reduce((sum, p) => sum + p.principalAmount, 0);
  const totalPaid = principalPaid + totalInterestPaid;
  
  const remainingPrincipal = Math.max(0, customer.principal - principalPaid);
  const remainingAccruedInterest = Math.max(0, accruedInterest - totalInterestPaid);
  const totalPayable = remainingPrincipal + remainingAccruedInterest;
  const totalAmountWithInterest = customer.principal + accruedInterest;
  
  const dailyInterest = customer.interestType === 'daily' 
    ? customer.principal * (customer.interestRate / 100)
    : customer.principal * (customer.interestRate / 100) / 30;
  
  return {
    accruedInterest: Math.round(accruedInterest),
    totalExpectedInterest: Math.round(totalExpectedInterest),
    advanceInterest: Math.round(advanceInterest),
    interestPaidFromPayments: Math.round(interestPaidFromPayments),
    totalInterestPaid: Math.round(totalInterestPaid),
    principalPaid: Math.round(principalPaid),
    totalPaid: Math.round(totalPaid),
    remainingPrincipal: Math.round(remainingPrincipal),
    remainingAccruedInterest: Math.round(remainingAccruedInterest),
    totalPayable: Math.round(totalPayable),
    totalAmountWithInterest: Math.round(totalAmountWithInterest),
    daysElapsed,
    totalDays,
    dailyInterest: Math.round(dailyInterest * 100) / 100
  };
};

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [search, setSearch] = useState('');
  const [currentView, setCurrentView] = useState<Screen>('home');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingPayment, setEditingPayment] = useState<{ customerId: string; payment: Payment } | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedCustomers = localStorage.getItem('ledger-customers-v3');
    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers));
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }
    setDataLoaded(true);
    
    const savedTheme = localStorage.getItem('ledger-theme');
    if (savedTheme) setTheme(savedTheme as Theme);
  }, []);

  // Save to localStorage whenever customers change
  useEffect(() => {
    if (dataLoaded) {
      localStorage.setItem('ledger-customers-v3', JSON.stringify(customers));
    }
  }, [customers, dataLoaded]);

  useEffect(() => {
    localStorage.setItem('ledger-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const addCustomer = (data: Omit<Customer, 'id' | 'payments' | 'createdAt'>) => {
    const customer: Customer = {
      ...data,
      id: generateId(),
      payments: [],
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [customer, ...prev]);
    setShowAdd(false);
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    setEditingCustomer(null);
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setShowDeleteConfirm(null);
    setSelectedCustomer(null);
  };

  const addPayment = (customerId: string, amount: number, principalAmount: number, interestAmount: number, note?: string, date?: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    
    const payment: Payment = {
      id: generateId(),
      amount,
      principalAmount,
      interestAmount,
      date: date || new Date().toISOString(),
      note
    };
    
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, payments: [...c.payments, payment] }
        : c
    ));
    setShowPayment(false);
  };

  const deletePayment = (customerId: string, paymentId: string) => {
    if (!confirm('Delete this payment?')) return;
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, payments: c.payments.filter(p => p.id !== paymentId) }
        : c
    ));
  };

  const updatePayment = (customerId: string, paymentId: string, data: Partial<Payment>) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, payments: c.payments.map(p => p.id === paymentId ? { ...p, ...data } : p) }
        : c
    ));
    setEditingPayment(null);
  };

  const exportExcel = () => {
    const data = customers.map(c => {
      const calc = calculateInterest(c);
      return {
        'Name': c.name,
        'Phone': c.phone,
        'Principal': c.principal,
        'Rate': `${c.interestRate}% ${c.interestType}`,
        'Start Date': format(new Date(c.startDate), 'dd-MM-yyyy'),
        'Due Date': format(new Date(c.dueDate), 'dd-MM-yyyy'),
        'Total Paid': calc.totalPaid,
        'Principal Paid': calc.principalPaid,
        'Interest Paid': calc.totalInterestPaid,
        'Remaining Principal': calc.remainingPrincipal,
        'Remaining Interest': calc.remainingAccruedInterest,
        'Total Payable': calc.totalPayable,
        'Days': calc.daysElapsed,
        'Status': calc.totalPayable <= 1 ? 'Paid' : isPast(new Date(c.dueDate)) ? 'Overdue' : 'Active'
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, `Finance_Ledger_${format(new Date(), 'ddMMyy')}.xlsx`);
  };

  const clearAllData = () => {
    if (confirm('⚠️ WARNING: This will DELETE ALL data permanently! Are you sure?')) {
      if (confirm('⚠️ FINAL WARNING: This cannot be undone! Continue?')) {
        localStorage.removeItem('ledger-customers-v3');
        setCustomers([]);
      }
    }
  };

  const bg = theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]';
  const cardBg = theme === 'dark' ? 'bg-[#111111] border-[#222]' : 'bg-white border-[#e5e7eb]';
  const text = theme === 'dark' ? 'text-[#ededed]' : 'text-[#111]';
  const textMuted = theme === 'dark' ? 'text-[#888]' : 'text-[#666]';
  const border = theme === 'dark' ? 'border-[#222]' : 'border-[#e5e7eb]';
  const hover = theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-[#f5f5f5]';

  // Loading screen
  if (!dataLoaded) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#111] dark:bg-white flex items-center justify-center animate-pulse">
            <IndianRupee className="w-6 h-6 text-white dark:text-black" />
          </div>
          <p className={textMuted}>Loading your data...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalGiven: customers.reduce((s, c) => s + c.principal, 0),
    totalReceived: customers.reduce((s, c) => s + calculateInterest(c).totalPaid, 0),
    totalPending: customers.reduce((s, c) => s + calculateInterest(c).totalPayable, 0),
    totalInterest: customers.reduce((s, c) => s + calculateInterest(c).accruedInterest, 0),
    active: customers.filter(c => calculateInterest(c).totalPayable > 1).length,
    overdue: customers.filter(c => {
      const calc = calculateInterest(c);
      return calc.totalPayable > 1 && isPast(new Date(c.dueDate)) && !isToday(new Date(c.dueDate));
    }).length
  };

  const filteredCustomers = customers.filter(c => {
    return c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
  });

  return (
    <div className={`min-h-screen ${bg} ${text} antialiased`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-[#0a0a0a]/80' : 'bg-[#fafafa]/80'} backdrop-blur-xl border-b ${border}`}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#111] dark:bg-white flex items-center justify-center">
              <IndianRupee className="w-4.5 h-4.5 text-white dark:text-black" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-[17px] tracking-tight">Ledger</span>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`w-8 h-8 rounded-lg flex items-center justify-center ${hover} transition-colors`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-24 pt-5">
        {/* HOME VIEW */}
        {currentView === 'home' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-[26px] font-bold tracking-tight leading-none">Hello</h1>
              <p className={`${textMuted} text-[14px] mt-1`}>{customers.length} customers • {stats.active} active</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`${cardBg} border rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${textMuted} text-[12px] font-medium`}>GIVEN</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#666]" />
                </div>
                <p className="text-[22px] font-bold tracking-tight">{formatCurrency(stats.totalGiven)}</p>
              </div>
              <div className={`${cardBg} border rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${textMuted} text-[12px] font-medium`}>RECEIVED</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-[#16a34a]" />
                </div>
                <p className="text-[22px] font-bold tracking-tight text-[#16a34a]">{formatCurrency(stats.totalReceived)}</p>
              </div>
              <div className={`${cardBg} border rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${textMuted} text-[12px] font-medium`}>PENDING</span>
                  <Clock className="w-3.5 h-3.5 text-[#ea580c]" />
                </div>
                <p className="text-[22px] font-bold tracking-tight text-[#ea580c]">{formatCurrency(stats.totalPending)}</p>
              </div>
              <div className={`${cardBg} border rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${textMuted} text-[12px] font-medium`}>INTEREST</span>
                  <TrendingUp className="w-3.5 h-3.5 text-[#2563eb]" />
                </div>
                <p className="text-[22px] font-bold tracking-tight text-[#2563eb]">{formatCurrency(stats.totalInterest)}</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setShowAdd(true)} className="flex-1 h-12 bg-[#111] dark:bg-white text-white dark:text-black rounded-xl font-medium text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
                <Plus className="w-4 h-4" /> New Entry
              </button>
              <button onClick={exportExcel} className={`h-12 px-4 ${cardBg} border rounded-xl font-medium text-[14px] flex items-center gap-1.5 active:scale-[0.98] transition-transform`}>
                <Download className="w-4 h-4" />
              </button>
            </div>

            {stats.overdue > 0 && (
              <div className="bg-[#fef2f2] dark:bg-[#450a0a]/30 border border-[#fecaca] dark:border-[#7f1d1d] rounded-2xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14px] text-[#991b1b] dark:text-[#fca5a5]">{stats.overdue} overdue payments</p>
                  <p className="text-[12px] text-[#b91c1c] dark:text-[#fca5a5]/80 mt-0.5">Tap to view and collect</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#dc2626] shrink-0" />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[15px]">Recent Activity</h2>
                <button onClick={() => setCurrentView('customers')} className={`text-[13px] ${textMuted} font-medium`}>View all</button>
              </div>
              <div className="space-y-2.5">
                {customers.slice(0, 3).map(customer => {
                  const calc = calculateInterest(customer);
                  const isOverdue = calc.totalPayable > 1 && isPast(new Date(customer.dueDate));
                  return (
                    <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setCurrentView('customers'); }} className={`w-full ${cardBg} border rounded-2xl p-3.5 text-left active:scale-[0.99] transition-transform`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'} flex items-center justify-center font-semibold text-[15px]`}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-[14px] truncate">{customer.name}</p>
                            {isOverdue && <span className="w-1.5 h-1.5 bg-[#dc2626] rounded-full" />}
                          </div>
                          <p className={`${textMuted} text-[12px]`}>{customer.phone} • {customer.interestRate}% {customer.interestType}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-[15px] ${isOverdue ? 'text-[#dc2626]' : ''}`}>{formatCurrency(calc.totalPayable)}</p>
                          <p className={`${textMuted} text-[11px]`}>due</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {customers.length === 0 && (
                  <div className={`${cardBg} border rounded-2xl p-8 text-center`}>
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'} flex items-center justify-center`}>
                      <Users className={`w-6 h-6 ${textMuted}`} />
                    </div>
                    <p className="font-medium text-[14px] mb-1">No customers yet</p>
                    <p className={`${textMuted} text-[13px] mb-4`}>Add your first loan entry to get started</p>
                    <button onClick={() => setShowAdd(true)} className="h-9 px-4 bg-[#111] dark:bg-white text-white dark:text-black rounded-lg text-[13px] font-medium">Add Customer</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS VIEW */}
        {currentView === 'customers' && !selectedCustomer && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone" className={`w-full h-11 pl-9 pr-3 ${cardBg} border rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[#111]/10 dark:focus:ring-white/10`} />
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredCustomers.map(customer => {
                const calc = calculateInterest(customer);
                const isOverdue = calc.totalPayable > 1 && isPast(new Date(customer.dueDate));
                const isPaid = calc.totalPayable <= 1;
                const daysLeft = differenceInDays(new Date(customer.dueDate), new Date());
                
                return (
                  <button key={customer.id} onClick={() => setSelectedCustomer(customer)} className={`w-full ${cardBg} border rounded-2xl p-4 text-left active:scale-[0.99] transition-transform`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'} flex items-center justify-center font-semibold`}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[15px] leading-tight">{customer.name}</p>
                          <p className={`${textMuted} text-[12px] mt-0.5`}>{customer.phone}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${isPaid ? 'bg-[#dcfce7] text-[#166534] dark:bg-[#14532d] dark:text-[#bbf7d0]' : isOverdue ? 'bg-[#fee2e2] text-[#991b1b] dark:bg-[#7f1d1d] dark:text-[#fecaca]' : 'bg-[#fef3c7] text-[#92400e] dark:bg-[#78350f] dark:text-[#fde68a]'}`}>
                        {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Active'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-dashed ${border}">
                      <div>
                        <p className={`${textMuted} text-[11px]`}>Principal</p>
                        <p className="font-semibold text-[14px] mt-0.5">{formatCurrency(customer.principal)}</p>
                      </div>
                      <div>
                        <p className={`${textMuted} text-[11px]`}>Paid</p>
                        <p className="font-semibold text-[14px] mt-0.5 text-[#16a34a]">{formatCurrency(calc.totalPaid)}</p>
                      </div>
                      <div>
                        <p className={`${textMuted} text-[11px]`}>Balance</p>
                        <p className={`font-semibold text-[14px] mt-0.5 ${isOverdue ? 'text-[#dc2626]' : ''}`}>{formatCurrency(calc.totalPayable)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-[12px] ${textMuted}`}>{customer.interestRate}% {customer.interestType} • {calc.daysElapsed}d</span>
                      <span className={`text-[12px] font-medium ${daysLeft < 0 ? 'text-[#dc2626]' : daysLeft <= 3 ? 'text-[#ea580c]' : textMuted}`}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CUSTOMER DETAIL */}
        {currentView === 'customers' && selectedCustomer && (
          <div className="space-y-4">
            <button onClick={() => setSelectedCustomer(null)} className={`flex items-center gap-1.5 -ml-1 mb-1 ${textMuted} active:opacity-70`}>
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span className="text-[14px] font-medium">Back</span>
            </button>

            {(() => {
              const calc = calculateInterest(selectedCustomer);
              const isOverdue = calc.totalPayable > 1 && isPast(new Date(selectedCustomer.dueDate));
              
              return (
                <>
                  <div className={`${cardBg} border rounded-2xl p-5`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-14 h-14 rounded-2xl ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'} flex items-center justify-center text-[20px] font-bold`}>
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h1 className="text-[20px] font-bold leading-tight">{selectedCustomer.name}</h1>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`flex items-center gap-1 text-[13px] ${textMuted}`}>
                              <Phone className="w-3 h-3" /> {selectedCustomer.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingCustomer(selectedCustomer)} className={`w-8 h-8 rounded-lg ${hover} flex items-center justify-center text-[#2563eb]`}>
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(selectedCustomer.id)} className={`w-8 h-8 rounded-lg ${hover} flex items-center justify-center text-[#dc2626]`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
                        <p className={`${textMuted} text-[11px] mb-1`}>Principal</p>
                        <p className="text-[17px] font-bold">{formatCurrency(selectedCustomer.principal)}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
                        <p className={`${textMuted} text-[11px] mb-1`}>Interest</p>
                        <p className="text-[17px] font-bold text-[#2563eb]">{formatCurrency(calc.accruedInterest)}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
                        <p className={`${textMuted} text-[11px] mb-1`}>Total</p>
                        <p className="text-[17px] font-bold">{formatCurrency(calc.totalAmountWithInterest)}</p>
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-xl border-2 ${isOverdue ? 'border-[#dc2626] bg-[#fef2f2] dark:bg-[#450a0a]/20' : 'border-[#16a34a] bg-[#f0fdf4] dark:bg-[#14532d]/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[12px] font-medium ${textMuted}`}>Amount to Collect</span>
                        <span className={`text-[22px] font-bold ${isOverdue ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>{formatCurrency(calc.totalPayable)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[11px] ${textMuted}`}>After {formatCurrency(calc.totalPaid)} paid</span>
                        <span className={`text-[11px] font-medium ${textMuted}`}>P: {formatCurrency(calc.remainingPrincipal)} + I: {formatCurrency(calc.remainingAccruedInterest)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`${cardBg} border rounded-2xl p-4`}>
                    <h3 className="font-semibold text-[14px] mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#2563eb]" />
                      Interest Breakdown
                    </h3>
                    
                    <div className={`p-4 rounded-xl mb-4 ${selectedCustomer.interestType === 'daily' ? 'bg-[#dbeafe] dark:bg-[#1e3a8a]/30' : 'bg-[#dcfce7] dark:bg-[#14532d]/30'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[12px] font-semibold ${selectedCustomer.interestType === 'daily' ? 'text-[#1e40af]' : 'text-[#166534]'}`}>
                          {selectedCustomer.interestType === 'daily' ? '📅 DAILY INTEREST' : '📆 MONTHLY INTEREST'}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded ${selectedCustomer.interestType === 'daily' ? 'bg-[#1e40af]/20 text-[#1e40af]' : 'bg-[#166534]/20 text-[#166534]'}`}>
                          {selectedCustomer.interestRate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className={`text-[11px] ${textMuted}`}>Total Interest</p>
                          <p className="text-[18px] font-bold text-[#2563eb]">{formatCurrency(calc.accruedInterest)}</p>
                        </div>
                        <div>
                          <p className={`text-[11px] ${textMuted}`}>Interest Paid</p>
                          <p className="text-[18px] font-bold text-[#16a34a]">{formatCurrency(calc.totalInterestPaid)}</p>
                        </div>
                      </div>
                      <div className={`mt-3 pt-3 border-t ${selectedCustomer.interestType === 'daily' ? 'border-[#1e40af]/20' : 'border-[#166534]/20'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[12px] font-medium ${textMuted}`}>Interest Remaining</span>
                          <span className={`text-[20px] font-bold ${calc.remainingAccruedInterest > 0 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`}>
                            {formatCurrency(calc.remainingAccruedInterest)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2.5 text-[13px]">
                      <div className="flex justify-between">
                        <span className={textMuted}>Rate</span>
                        <span className="font-medium">{selectedCustomer.interestRate}% per {selectedCustomer.interestType === 'daily' ? 'day' : 'month'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={textMuted}>Daily accrual</span>
                        <span className="font-medium text-[#2563eb]">{formatCurrency(calc.dailyInterest)}/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={textMuted}>Time elapsed</span>
                        <span className="font-medium">{calc.daysElapsed} days ({Math.floor(calc.daysElapsed/30)}m {calc.daysElapsed%30}d)</span>
                      </div>
                      {selectedCustomer.advanceInterestPaid > 0 && (
                        <div className="flex justify-between">
                          <span className={textMuted}>Advance interest paid</span>
                          <span className="font-medium text-[#16a34a]">{formatCurrency(selectedCustomer.advanceInterestPaid)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2.5 border-t border-dashed ${border}">
                        <span className={textMuted}>Total interest accrued</span>
                        <span className="font-semibold">{formatCurrency(calc.accruedInterest)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={textMuted}>Less: Interest paid</span>
                        <span className="font-medium text-[#16a34a]">- {formatCurrency(calc.totalInterestPaid)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t ${border}">
                        <span>Interest due now</span>
                        <span className="text-[#ea580c]">{formatCurrency(calc.remainingAccruedInterest)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`${cardBg} border rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-[14px]">Payments</h3>
                      <span className={`${textMuted} text-[12px]`}>{selectedCustomer.payments.length} transactions</span>
                    </div>
                    
                    {selectedCustomer.payments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedCustomer.payments.slice().reverse().map(payment => (
                          <div key={payment.id} className={`flex items-center justify-between py-2.5 border-b ${border} last:border-0`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg bg-[#dcfce7] dark:bg-[#14532d] flex items-center justify-center`}>
                                <IndianRupee className="w-3.5 h-3.5 text-[#16a34a]" />
                              </div>
                              <div>
                                <p className="text-[13px] font-medium leading-tight">{formatCurrency(payment.amount)}</p>
                                <p className={`${textMuted} text-[11px]`}>
                                  {format(new Date(payment.date), 'dd MMM yyyy')} • 
                                  P: {formatCurrency(payment.principalAmount)} | I: {formatCurrency(payment.interestAmount)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {payment.note && <span className={`text-[11px] px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'}`}>{payment.note}</span>}
                              <button onClick={() => setEditingPayment({ customerId: selectedCustomer.id, payment })} className={`w-7 h-7 rounded-md ${hover} flex items-center justify-center text-[#2563eb]`}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deletePayment(selectedCustomer.id, payment.id)} className={`w-7 h-7 rounded-md ${hover} flex items-center justify-center text-[#dc2626]`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`${textMuted} text-[13px] text-center py-6`}>No payments recorded yet</p>
                    )}
                    
                    <button onClick={() => setShowPayment(true)} className="w-full mt-3 h-10 bg-[#111] dark:bg-white text-white dark:text-black rounded-xl font-medium text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
                      <Plus className="w-3.5 h-3.5" /> Record Payment
                    </button>
                  </div>

                  <div className={`${cardBg} border rounded-2xl p-4`}>
                    <h3 className="font-semibold text-[14px] mb-3">Loan Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-[13px]">
                      <div>
                        <p className={`${textMuted} text-[11px] mb-1`}>Start Date</p>
                        <p className="font-medium">{format(new Date(selectedCustomer.startDate), 'dd MMM yyyy')}</p>
                      </div>
                      <div>
                        <p className={`${textMuted} text-[11px] mb-1`}>Due Date</p>
                        <p className="font-medium">{format(new Date(selectedCustomer.dueDate), 'dd MMM yyyy')}</p>
                      </div>
                      <div>
                        <p className={`${textMuted} text-[11px] mb-1`}>Principal Paid</p>
                        <p className="font-medium text-[#16a34a]">{formatCurrency(calc.principalPaid)}</p>
                      </div>
                      <div>
                        <p className={`${textMuted} text-[11px] mb-1`}>Principal Due</p>
                        <p className="font-medium">{formatCurrency(calc.remainingPrincipal)}</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ADMIN LOGS */}
        {currentView === 'admin' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-[22px] font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#2563eb]" />
                Audit Log
              </h1>
              <span className={`text-[12px] ${textMuted}`}>{customers.length} Accounts</span>
            </div>

            <div className="space-y-2.5">
              {(() => {
                const allLogs: { type: 'customer' | 'payment'; text: string; date: string; amount?: number; id: string; customerName: string }[] = [];
                customers.forEach(c => {
                  allLogs.push({
                    type: 'customer',
                    text: `Created loan account (${c.interestRate}% ${c.interestType})`,
                    date: c.createdAt,
                    amount: c.principal,
                    id: `c_${c.id}`,
                    customerName: c.name
                  });
                  c.payments.forEach(p => {
                    allLogs.push({
                      type: 'payment',
                      text: `Payment: P: ${formatCurrency(p.principalAmount)} | I: ${formatCurrency(p.interestAmount)}${p.note ? ` (${p.note})` : ''}`,
                      date: p.date,
                      amount: p.amount,
                      id: `p_${p.id}`,
                      customerName: c.name
                    });
                  });
                });
                return allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                  <div key={log.id} className={`${cardBg} border rounded-xl p-3 flex items-start justify-between text-[13px]`}>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${log.type === 'customer' ? 'bg-[#dbeafe] text-[#1e40af] dark:bg-[#1e3a8a] dark:text-[#93c5fd]' : 'bg-[#dcfce7] text-[#166534] dark:bg-[#14532d] dark:text-[#bbf7d0]'}`}>
                          {log.type}
                        </span>
                        <span className="font-semibold">{log.customerName}</span>
                      </div>
                      <p className={`${textMuted} text-[12px]`}>{log.text}</p>
                      <p className={`text-[11px] ${textMuted} mt-1`}>{format(new Date(log.date), 'dd MMM yyyy • hh:mm a')}</p>
                    </div>
                    {log.amount && <span className="font-bold text-[14px]">{formatCurrency(log.amount)}</span>}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {currentView === 'reports' && (
          <div className="space-y-4">
            <h1 className="text-[22px] font-bold">Reports</h1>
            
            <div className={`${cardBg} border rounded-2xl p-4`}>
              <h3 className="font-semibold text-[14px] mb-3">Summary</h3>
              <div className="space-y-2.5 text-[14px]">
                {[
                  { label: 'Total customers', value: customers.length },
                  { label: 'Active loans', value: stats.active },
                  { label: 'Overdue', value: stats.overdue, highlight: true },
                  { label: 'Total principal given', value: formatCurrency(stats.totalGiven) },
                  { label: 'Total collected', value: formatCurrency(stats.totalReceived) },
                  { label: 'Outstanding', value: formatCurrency(stats.totalPending) },
                  { label: 'Interest earned', value: formatCurrency(stats.totalInterest) },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b last:border-0 ${border}">
                    <span className={textMuted}>{item.label}</span>
                    <span className={`font-semibold ${item.highlight ? 'text-[#dc2626]' : ''}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={exportExcel} className={`w-full ${cardBg} border rounded-2xl p-4 flex items-center justify-between active:scale-[0.99] transition-transform`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'} flex items-center justify-center`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[14px]">Export to Excel</p>
                  <p className={`${textMuted} text-[12px]`}>Download complete ledger</p>
                </div>
              </div>
              <Download className={`w-4 h-4 ${textMuted}`} />
            </button>
          </div>
        )}

        {/* SETTINGS */}
        {currentView === 'settings' && (
          <div className="space-y-4">
            <h1 className="text-[22px] font-bold">Settings</h1>
            
            <div className={`${cardBg} border rounded-2xl p-4`}>
              <h3 className="font-semibold text-[14px] mb-2">Data Storage</h3>
              <p className={`${textMuted} text-[13px] leading-relaxed mb-3`}>
                All data is saved in your browser's local storage. It will persist even if you close the browser or restart your phone. Data is only deleted if you clear browser data.
              </p>
              <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-medium">Stored Customers</span>
                  <span className="text-[18px] font-bold">{customers.length}</span>
                </div>
              </div>
            </div>

            <button onClick={clearAllData} className="w-full h-11 rounded-xl border border-[#dc2626] text-[#dc2626] font-medium text-[14px] flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete All Data
            </button>

            <div className={`${cardBg} border rounded-2xl p-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111] dark:bg-white flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-white dark:text-black" />
                </div>
                <div>
                  <p className="font-semibold text-[14px]">Ledger v2.0</p>
                  <p className={`${textMuted} text-[12px]`}>Made for Indian businesses</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className={`fixed bottom-0 inset-x-0 z-30 ${theme === 'dark' ? 'bg-[#0a0a0a]/90' : 'bg-[#fafafa]/90'} backdrop-blur-2xl border-t ${border}`}>
        <div className="max-w-lg mx-auto px-2 h-[70px] flex items-center justify-around">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'customers', icon: Users, label: 'Customers' },
            { id: 'admin', icon: ShieldAlert, label: 'Audit' },
            { id: 'reports', icon: PieChart, label: 'Reports' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map(item => (
            <button key={item.id} onClick={() => { setCurrentView(item.id as Screen); setSelectedCustomer(null); }} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${currentView === item.id ? '' : 'opacity-60'}`}>
              <item.icon className={`w-[22px] h-[22px]`} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Add Customer Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full sm:max-w-md max-h-[92vh] overflow-auto ${cardBg} sm:rounded-2xl rounded-t-3xl shadow-2xl`}>
            <div className={`sticky top-0 ${cardBg} border-b ${border} px-5 h-14 flex items-center justify-between`}>
              <h2 className="font-semibold text-[17px]">New Loan</h2>
              <button onClick={() => setShowAdd(false)} className={`w-8 h-8 rounded-lg ${hover} flex items-center justify-center`}>
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              addCustomer({
                name: fd.get('name') as string,
                phone: fd.get('phone') as string,
                address: fd.get('address') as string,
                principal: Number(fd.get('principal')),
                advanceInterestPaid: Number(fd.get('advanceInterest')) || 0,
                interestRate: Number(fd.get('rate')),
                interestType: fd.get('type') as 'daily' | 'monthly',
                startDate: fd.get('start') as string,
                dueDate: fd.get('due') as string,
              });
            }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Customer Name *</label>
                  <input name="name" required placeholder="Rahul Sharma" className={`w-full h-11 px-3.5 rounded-xl border ${border} ${cardBg} text-[15px] outline-none`} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Phone *</label>
                  <input name="phone" required placeholder="+91 98765 43210" className={`w-full h-11 px-3.5 rounded-xl border ${border} ${cardBg} text-[15px] outline-none`} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Address</label>
                  <input name="address" placeholder="Optional" className={`w-full h-11 px-3.5 rounded-xl border ${border} ${cardBg} text-[15px] outline-none`} />
                </div>
              </div>

              <div className={`h-px ${border} -mx-5`} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Principal *</label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[15px] ${textMuted}`}>₹</span>
                    <input name="principal" type="number" required placeholder="50000" className={`w-full h-11 pl-7 pr-3 rounded-xl border ${border} ${cardBg} text-[16px] font-medium outline-none`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Advance Interest</label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[15px] ${textMuted}`}>₹</span>
                    <input name="advanceInterest" type="number" placeholder="0" className={`w-full h-11 pl-7 pr-3 rounded-xl border ${border} ${cardBg} text-[16px] font-medium outline-none`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Interest Type *</label>
                  <select name="type" defaultValue="monthly" className={`w-full h-11 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`}>
                    <option value="monthly">Monthly (%)</option>
                    <option value="daily">Daily (%)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Rate *</label>
                  <div className="relative">
                    <input name="rate" type="number" step="0.1" required placeholder="5" className={`w-full h-11 px-3 pr-7 rounded-xl border ${border} ${cardBg} text-[15px] outline-none`} />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[14px] ${textMuted}`}>%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Start Date *</label>
                  <input name="start" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className={`w-full h-11 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Due Date *</label>
                  <input name="due" type="date" required defaultValue={format(addMonths(new Date(), 1), 'yyyy-MM-dd')} className={`w-full h-11 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className={`flex-1 h-11 rounded-xl border ${border} font-medium text-[14px]`}>Cancel</button>
                <button type="submit" className="flex-1 h-11 rounded-xl bg-[#111] dark:bg-white text-white dark:text-black font-medium text-[14px]">Create Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full sm:max-w-sm ${cardBg} sm:rounded-2xl rounded-t-3xl shadow-2xl`}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[17px]">Record Payment</h2>
                <button onClick={() => setShowPayment(false)} className={`w-8 h-8 rounded-lg ${hover} flex items-center justify-center`}>
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f5]'} mb-4`}>
                <p className={`${textMuted} text-[12px]`}>For</p>
                <p className="font-semibold">{selectedCustomer.name}</p>
                <p className="text-[13px] text-[#ea580c] mt-0.5">Due: {formatCurrency(calculateInterest(selectedCustomer).totalPayable)}</p>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.target as HTMLFormElement);
                const principal = Number(fd.get('principal')) || 0;
                const interest = Number(fd.get('interest')) || 0;
                addPayment(
                  selectedCustomer.id,
                  principal + interest,
                  principal,
                  interest,
                  fd.get('note') as string,
                  fd.get('date') as string
                );
              }} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Principal *</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[14px] ${textMuted}`}>₹</span>
                      <input name="principal" type="number" required placeholder="0" autoFocus className={`w-full h-11 pl-7 pr-3 rounded-xl border ${border} ${cardBg} text-[16px] font-medium outline-none`} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Interest *</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[14px] ${textMuted}`}>₹</span>
                      <input name="interest" type="number" required placeholder="0" className={`w-full h-11 pl-7 pr-3 rounded-xl border ${border} ${cardBg} text-[16px] font-medium outline-none`} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Payment Date</label>
                  <input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className={`w-full h-10 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>

                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Note</label>
                  <input name="note" placeholder="Cash, UPI, etc." className={`w-full h-10 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={() => setShowPayment(false)} className={`flex-1 h-11 rounded-xl border ${border} font-medium text-[14px]`}>Cancel</button>
                  <button type="submit" className="flex-1 h-11 rounded-xl bg-[#16a34a] text-white font-medium text-[14px]">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full sm:max-w-md max-h-[92vh] overflow-auto ${cardBg} sm:rounded-2xl rounded-t-3xl shadow-2xl`}>
            <div className={`sticky top-0 ${cardBg} border-b ${border} px-5 h-14 flex items-center justify-between`}>
              <h2 className="font-semibold text-[17px]">Edit Loan Entry</h2>
              <button onClick={() => setEditingCustomer(null)} className={`w-8 h-8 rounded-lg ${hover} flex items-center justify-center`}>
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              updateCustomer(editingCustomer.id, {
                name: fd.get('name') as string,
                phone: fd.get('phone') as string,
                principal: Number(fd.get('principal')),
                advanceInterestPaid: Number(fd.get('advanceInterest')) || 0,
                interestRate: Number(fd.get('rate')),
                interestType: fd.get('type') as 'daily' | 'monthly',
                startDate: fd.get('start') as string,
                dueDate: fd.get('due') as string,
              });
            }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Customer Name *</label>
                  <input name="name" defaultValue={editingCustomer.name} required className={`w-full h-11 px-3.5 rounded-xl border ${border} ${cardBg} text-[15px] outline-none`} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Phone *</label>
                  <input name="phone" defaultValue={editingCustomer.phone} required className={`w-full h-11 px-3.5 rounded-xl border ${border} ${cardBg} text-[15px] outline-none`} />
                </div>
              </div>

              <div>
                <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Principal Amount *</label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] ${textMuted}`}>₹</span>
                  <input name="principal" defaultValue={editingCustomer.principal} type="number" required className={`w-full h-12 pl-8 pr-3.5 rounded-xl border ${border} ${cardBg} text-[17px] font-medium outline-none`} />
                </div>
              </div>

              <div>
                <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Advance Interest Paid</label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] ${textMuted}`}>₹</span>
                  <input name="advanceInterest" defaultValue={editingCustomer.advanceInterestPaid || 0} type="number" className={`w-full h-12 pl-8 pr-3.5 rounded-xl border ${border} ${cardBg} text-[17px] font-medium outline-none`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Interest Type *</label>
                  <select name="type" defaultValue={editingCustomer.interestType} className={`w-full h-11 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`}>
                    <option value="monthly">Monthly (%)</option>
                    <option value="daily">Daily (%)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Rate *</label>
                  <div className="relative">
                    <input name="rate" defaultValue={editingCustomer.interestRate} type="number" step="0.1" required className={`w-full h-11 px-3 pr-7 rounded-xl border ${border} ${cardBg} text-[15px] outline-none`} />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[14px] ${textMuted}`}>%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Start Date *</label>
                  <input name="start" type="date" defaultValue={editingCustomer.startDate} required className={`w-full h-11 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>
                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Due Date *</label>
                  <input name="due" type="date" defaultValue={editingCustomer.dueDate} required className={`w-full h-11 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setEditingCustomer(null)} className={`flex-1 h-11 rounded-xl border ${border} font-medium text-[14px]`}>Cancel</button>
                <button type="submit" className="flex-1 h-11 rounded-xl bg-[#2563eb] text-white font-medium text-[14px]">Update Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`w-full sm:max-w-sm ${cardBg} sm:rounded-2xl rounded-t-3xl shadow-2xl`}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[17px]">Edit Payment</h2>
                <button onClick={() => setEditingPayment(null)} className={`w-8 h-8 rounded-lg ${hover} flex items-center justify-center`}>
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.target as HTMLFormElement);
                const p = Number(fd.get('principal')) || 0;
                const i = Number(fd.get('interest')) || 0;
                updatePayment(editingPayment.customerId, editingPayment.payment.id, {
                  amount: p + i,
                  principalAmount: p,
                  interestAmount: i,
                  date: fd.get('date') as string,
                  note: fd.get('note') as string
                });
              }} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Principal *</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[14px] ${textMuted}`}>₹</span>
                      <input name="principal" type="number" defaultValue={editingPayment.payment.principalAmount} required autoFocus className={`w-full h-11 pl-7 pr-3 rounded-xl border ${border} ${cardBg} text-[16px] font-medium outline-none`} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Interest *</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[14px] ${textMuted}`}>₹</span>
                      <input name="interest" type="number" defaultValue={editingPayment.payment.interestAmount} required className={`w-full h-11 pl-7 pr-3 rounded-xl border ${border} ${cardBg} text-[16px] font-medium outline-none`} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Payment Date</label>
                  <input name="date" type="date" defaultValue={editingPayment.payment.date ? format(new Date(editingPayment.payment.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} className={`w-full h-10 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>

                <div>
                  <label className={`block text-[12px] font-medium mb-1.5 ${textMuted}`}>Note</label>
                  <input name="note" defaultValue={editingPayment.payment.note} className={`w-full h-10 px-3 rounded-xl border ${border} ${cardBg} text-[14px] outline-none`} />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={() => setEditingPayment(null)} className={`flex-1 h-11 rounded-xl border ${border} font-medium text-[14px]`}>Cancel</button>
                  <button type="submit" className="flex-1 h-11 rounded-xl bg-[#2563eb] text-white font-medium text-[14px]">Update</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-2xl p-5 w-full max-w-sm shadow-2xl`}>
            <div className="w-12 h-12 rounded-full bg-[#fee2e2] dark:bg-[#7f1d1d] flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-[#dc2626]" />
            </div>
            <h3 className="font-semibold text-[17px] text-center mb-1.5">Delete Customer?</h3>
            <p className={`${textMuted} text-[14px] text-center leading-relaxed mb-5`}>This will permanently delete all loan data and payment history. Cannot be undone.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowDeleteConfirm(null)} className={`flex-1 h-11 rounded-xl border ${border} font-medium text-[14px]`}>Cancel</button>
              <button onClick={() => deleteCustomer(showDeleteConfirm)} className="flex-1 h-11 rounded-xl bg-[#dc2626] text-white font-medium text-[14px]">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {!selectedCustomer && currentView !== 'settings' && (
        <button onClick={() => setShowAdd(true)} className="fixed bottom-[88px] right-4 w-14 h-14 bg-[#111] dark:bg-white text-white dark:text-black rounded-2xl shadow-xl flex items-center justify-center active:scale-95 transition-transform z-20">
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}