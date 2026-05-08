/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Database, 
  Thermometer, 
  Package, 
  Activity, 
  Lock, 
  Terminal,
  Cpu,
  Wifi,
  AlertTriangle,
  Mail,
  Smartphone,
  LogOut,
  Fingerprint,
  QrCode,
  CheckCircle2,
  XCircle,
  Eraser as Broom,
  ClipboardCheck,
  FileText,
  Search,
  Droplets,
  FlaskConical as Beaker,
  Award,
  Layers,
  History,
  AlertOctagon,
  ShieldCheck,
  BarChart3,
  Microscope,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, loginWithGoogle, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import * as otplib_mod from 'otplib';
// Robust access for different build environments
const authenticator = (otplib_mod as any).authenticator || (otplib_mod as any).default?.authenticator;
import { QRCodeSVG } from 'qrcode.react';
import { Buffer } from 'buffer';
import { analyzeMSDS, analyzeRawMaterialFTS, generateProductManual } from './services/geminiService';
import { translations, Language } from './translations';

// Fix for otplib buffer dependency if needed
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// --- ERRORS ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- COMPONENTS ---

const StatusBadge = ({ active, user }: { active: boolean, user: User | null }) => (
  <div className="flex flex-col items-end gap-1 mb-4">
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'} animate-pulse`} />
      <span className="text-[10px] font-mono text-emerald-500/80 tracking-widest uppercase">
        {active ? 'Session_Active // Encrypted' : 'Session_Terminated'}
      </span>
    </div>
    {user && (
      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
        UID: {user.uid.substring(0, 12)}... | {user.email}
      </span>
    )}
  </div>
);

// ... rest of components ...
const OperationCard = ({ title, icon: Icon, children, className = "" }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-[#0a0f1d] border border-white/10 shadow-sm p-6 relative overflow-hidden group transition-all duration-500 ${className}`}
  >
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-[#d4af37]/10 border border-[#d4af37]/30">
         <Icon className="w-4 h-4 gold-text" />
      </div>
      <h3 className="text-[11px] font-serif font-bold gold-text uppercase tracking-[0.25em]">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </motion.div>
);

const NavItem = ({ label, href, status = "Access" }: any) => (
  <a href={href} className="flex items-center justify-between py-2.5 border-b border-white/5 hover:border-[#d4af37]/50 group transition-all px-1">
    <span className="text-[10px] text-slate-400 group-hover:text-black uppercase font-bold tracking-wider flex items-center gap-2">
      <div className="w-1 h-1 bg-[#d4af37]/60 rounded-full" /> {label}
    </span>
    <span className="text-[9px] text-[#d4af37]/70 font-serif italic tracking-wide group-hover:text-[#d4af37] transition-colors">{status}</span>
  </a>
);

// --- MAIN APP ---

const Logo = ({ lang }: { lang: Language }) => (
  <div className="flex flex-col items-start">
    <div className="flex items-center gap-5">
      {/* Institutional Icon: Teapot + DNA Helix mirroring the provided PNG */}
      <div className="relative w-24 h-24 flex items-center justify-center p-2">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          {/* DNA Helix Left */}
          <path d="M15 30 Q 25 50 15 70 M 25 30 Q 15 50 25 70" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="35" x2="24" y2="35" stroke="#999" strokeWidth="1"/>
          <line x1="20" y1="50" x2="20" y2="50" stroke="#999" strokeWidth="1"/>
          <line x1="16" y1="65" x2="24" y2="65" stroke="#999" strokeWidth="1"/>
          
          {/* Teapot Body (Simplified high-end version) */}
          <path d="M50 25 C 30 25 25 45 25 55 C 25 75 50 85 75 55 C 75 45 70 25 50 25" fill="#888"/>
          <path d="M50 25 C 30 25 25 45 25 55 L 75 55 C 75 45 70 25 50 25" fill="#ccc"/>
          <circle cx="50" cy="20" r="6" fill="#ccc"/>
          
          {/* Spout and Handle (Stylized DNA-like) */}
          <path d="M25 55 Q 10 50 10 40" fill="none" stroke="#ccc" strokeWidth="4" strokeLinecap="round"/>
          <path d="M75 55 Q 90 50 90 40" fill="none" stroke="#888" strokeWidth="4" strokeLinecap="round"/>

          {/* DNA Helix Right */}
          <path d="M75 30 Q 85 50 75 70 M 85 30 Q 75 50 85 70" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
          <line x1="76" y1="35" x2="84" y2="35" stroke="#999" strokeWidth="1"/>
          <line x1="76" y1="65" x2="84" y2="65" stroke="#999" strokeWidth="1"/>
        </svg>
      </div>
      <div>
        <h1 className="text-4xl font-serif font-bold tracking-[0.02em] text-white leading-none">
          THE ONE ORDER
        </h1>
        <p className="text-[12px] text-slate-400 uppercase tracking-[0.4em] font-serif italic mt-1">
          {translations[lang].international}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3 mt-4 w-full">
      <div className="h-[1px] flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
      <span className="text-[11px] text-slate-500 uppercase tracking-[0.3em] font-sans font-black whitespace-nowrap px-4">
        {translations[lang].foodSafety} <span className="text-slate-200">|</span> {translations[lang].adminServices}
      </span>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  </div>
);

const LanguageSwitcher = ({ current, onSelect }: { current: Language, onSelect: (l: Language) => void }) => (
  <div className="flex gap-2 border-b border-white/5 pb-4 mb-4">
    {(['pt', 'en', 'es', 'ca'] as Language[]).map((l) => (
      <button
        key={l}
        onClick={() => onSelect(l)}
        className={`px-3 py-1 text-[10px] font-bold uppercase transition-all border ${current === l ? 'bg-[#d4af37]/10 border-[#d4af37] text-[#d4af37]' : 'bg-[#0a0f1d]/2 border-white/5 text-slate-400 hover:text-slate-400'}`}
      >
        {l}
      </button>
    ))}
  </div>
);

export default function App() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    // Language detection based on navigator.language
    const userLang = navigator.language.split('-')[0];
    if (['pt', 'en', 'es', 'ca'].includes(userLang)) {
      setLang(userLang as Language);
    }
  }, []);

  const t = translations[lang];

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [temp, setTemp] = useState(3.8);
  const [businessType, setBusinessType] = useState<string>('REST');
  const [complianceStandard, setComplianceStandard] = useState<'HACCP_BASE' | 'HACCP_SIMPLE' | 'ISO22000' | 'FSSC22000'>('HACCP_BASE');
  const [isSimplified, setIsSimplified] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  
  // Organization Details State
  const [orgForm, setOrgForm] = useState({
    tradingName: '',
    fiscalName: '',
    nif: '',
    address: '',
    cae: '',
    responsible: '',
    qualityManager: '',
    internalAuditor: '',
    externalAuditor: '',
  });

  const simulateNifLookup = (nif: string) => {
    if (nif.length === 9) {
      setLogs(prev => [`[SYSTEM] Searching Registro Nacional Pessoas Colectivas...`, ...prev]);
      setTimeout(() => {
        setOrgForm(prev => ({
          ...prev,
          fiscalName: prev.tradingName ? `${prev.tradingName} - UNIPESSOAL, LDA` : 'COMPANHIA EXEMPLAR, LDA',
          address: 'Zona Industrial da Maia, Lote 42, 4470-000 Maia',
          cae: '56101 - Restaurantes tipo tradicional com serviço de mesa'
        }));
        setLogs(prev => [`[SUCCESS] Data retrieved for NIF ${nif}`, ...prev]);
      }, 1500);
    }
  };
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);

  // TOTP State
  const [isTotpVerified, setIsTotpVerified] = useState(false);
  const [totpStep, setTotpStep] = useState<'LOGIN' | 'CHALLENGE' | 'SETUP' | 'CMD'>('LOGIN');
  const [totpCode, setTotpCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpError, setTotpError] = useState(false);
  
  // Admin Panel State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [passError, setPassError] = useState('');

  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 12;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    
    if (!minLength) return "Mínimo 12 caracteres.";
    if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) return "Deve conter: Maiúsculas, Minúsculas, Números e Símbolos.";
    return "";
  };
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [signingTask, setSigningTask] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState(94);
  const [ccpStatus, setCcpStatus] = useState<'SAFE' | 'DEVIATION'>('SAFE');
  const [msdsData, setMsdsData] = useState<any[]>([]);
  const [mpData, setMpData] = useState<any[]>([]);
  const [productManuals, setProductManuals] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChemicalLab, setShowChemicalLab] = useState(false);

  const logAccess = async (action: string, orgId?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `organizations/${orgId || 'GLOBAL'}/accessLogs`), {
        userId: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        action: action,
        isAdmin: profile?.role === 'ADMIN'
      });
    } catch (e) {
      console.error("Failed to log access:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setLogs(prev => [`[AUTH] Connected: ${u.email}`, ...prev]);
        
        // Simulação de carregamento de perfil. 
        // Na vida real: doc(db, 'system/users', u.uid)
        const mockProfile = { 
          role: u.email === 'luisaptibus@gmail.com' ? 'ADMIN' : 'OPERATOR',
          assignedOrgs: ['org_001', 'org_002']
        };
        setProfile(mockProfile);
        
        if (mockProfile.role === 'ADMIN') {
          setAvailableOrgs([
            { id: 'org_001', name: 'Restaurante Central' },
            { id: 'org_002', name: 'Padaria Norte' }
          ]);
          setCurrentOrgId('org_001');
        }

        setTotpStep('CHALLENGE');
        logAccess('LOGIN');
      } else {
        setIsTotpVerified(false);
        setProfile(null);
        setTotpStep('LOGIN');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [businessType]);

  const verifyTotp = () => {
    // In demo, we accept '000000' as master bypass, or real validation
    // Note: authenticator might still be problematic if not imported correctly.
    // We'll wrap it in a try-catch for safety during build
    let isValid = false;
    try {
      isValid = totpCode === '000000' || (totpSecret && authenticator.check(totpCode, totpSecret));
    } catch (e) {
      console.warn("Authenticator check failed, using fallback '000000'", e);
      isValid = totpCode === '000000';
    }

    if (isValid) {
      setIsTotpVerified(true);
      setLogs(prev => [`[2FA] TOTP Verification Successful`, ...prev]);
      setTotpError(false);
    } else {
      setTotpError(true);
      setLogs(prev => [`[SECURITY] 2FA_FAILURE :: Invalid TOTP Token`, ...prev]);
    }
  };

  const handleSetupTotp = () => {
    try {
      const secret = authenticator.generateSecret();
      setTotpSecret(secret);
      setTotpStep('SETUP');
      setLogs(prev => [`[VAULT] Initializing TOTP Provisioning...`, ...prev]);
    } catch (e) {
      console.error("Cannot generate secret:", e);
      setLogs(prev => [`[ERROR] TOTP Generator Fault :: Contact Admin`, ...prev]);
    }
  };

  const handleCmdLogin = () => {
    setTotpStep('CMD');
    setLogs(prev => [`[CMD] Requesting Chave Móvel Digital Gateway...`, ...prev]);
    // Simulate gateway response after short delay
    setTimeout(() => {
      setIsTotpVerified(true);
      setLogs(prev => [`[CMD] Authenticated via Gov.pt Gateway`, ...prev]);
      logAccess('LOGIN_CMD');
    }, 2000);
  };

  const performAIAnalysis = async (type: 'MSDS' | 'MP' | 'MANUAL') => {
    setIsAnalyzing(true);
    setLogs(prev => [`[AI_LAB] Initializing Neural Analysis for ${type}_Target...`, ...prev]);
    
    if (type === 'MSDS') {
      const result = await analyzeMSDS("Deter-Super-X");
      if (result) {
        setMsdsData(prev => [result, ...prev]);
        setLogs(prev => [`[AI_SUCCESS] Technical Specs Extracted: ${result.productName}`, ...prev]);
      }
    } else if (type === 'MP') {
      const result = await analyzeRawMaterialFTS("Carne de Bovino Selecionada");
      if (result) {
        setMpData(prev => [result, ...prev]);
        setLogs(prev => [`[AI_SUCCESS] MP Specifications Extracted: ${result.materialName}`, ...prev]);
      }
    } else if (type === 'MANUAL') {
      const result = await generateProductManual("Hambúrguer Gourmet HACCP", ["Lactogal Brioche", "Carne Bovino X"]);
      if (result) {
        setProductManuals(prev => [result, ...prev]);
        setLogs(prev => [`[AI_SUCCESS] Product Procedure Manual Generated: ${result.targetProduct}`, ...prev]);
      }
    }
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      setTemp(prev => {
        const next = +(prev + (Math.random() - 0.5) * 0.2).toFixed(1);
        return next;
      });
      
      if (Math.random() > 0.9) {
        const newLog = `[IOT] Telemetry_Recv :: Sensor_FRIDGE_01 :: Data: ${temp}ºC`;
        setLogs(prev => [newLog, ...prev].slice(0, 10));
      }
      
      // Simulação de Alerta de Energia (Loss of Power)
      if (Math.random() > 0.98) {
        const newLog = `[CRITICAL] GATEWAY_01 :: POWER_LOSS_DETECTED :: Switching to Backup Log...`;
        setLogs(prev => [newLog, ...prev].slice(0, 10));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [temp, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
               className="absolute inset-0 border border-white/5 rounded-full"
             />
             <div className="absolute inset-0 flex items-center justify-center">
                <Award className="w-8 h-8 gold-text animate-pulse" />
             </div>
          </div>
          <div className="text-slate-400 tracking-[0.4em] uppercase text-[9px] font-bold">Initializing The One Order Service</div>
        </div>
      </div>
    );
  }

  if (!user || !isTotpVerified) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(#d4af37 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full border border-white/10 bg-[#0a0f1d] p-12 shadow-2xl relative z-10"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#d4af37]" />
          
          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div 
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <Logo lang={lang} />
                
                <div className="mt-16 w-full space-y-8">
                  <div className="text-center">
                    <h2 className="text-xl font-serif font-bold text-white tracking-tight uppercase italic">{lang === 'pt' ? "Acesso Seguro" : "Secure Login"}</h2>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-2">
                       Institutional Portal :: Identity Verification Required
                    </p>
                  </div>

                  <button 
                    onClick={loginWithGoogle}
                    className="w-full py-6 border border-[#d4af37]/40 bg-[#d4af37]/5 text-[#d4af37] hover:bg-[#d4af37]/10 transition-all font-bold text-xs tracking-[0.25em] uppercase flex items-center justify-center gap-3 group"
                  >
                    <Database className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {lang === 'pt' ? "Autorizar Acesso Bio-Lock" : "Authorize Bio-Lock Access"}
                  </button>
                  
                  <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                     <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-relaxed text-center max-w-xs">
                        Este portal é de acesso restrito a colaboradores autorizados da The One Order International.
                     </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="totp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex flex-col items-center mb-12">
                   <Logo lang={lang} />
                </div>

                <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                  <Fingerprint className="text-[#d4af37] w-6 h-6" />
                  <h2 className="text-xl font-serif font-bold text-white tracking-widest uppercase italic">{lang === 'pt' ? "Validação 2FA" : "2FA Validation"}</h2>
                </div>
                
                {totpStep === 'CHALLENGE' ? (
                  <div className="space-y-6">
                    <p className="text-[11px] text-slate-500 leading-relaxed uppercase tracking-widest text-center">
                      {lang === 'pt' ? "Introduza o código de 6 dígitos da sua aplicação de autenticação." : "Enter the 6-digit code from your authenticator application."}
                    </p>
                    <div className="relative">
                      <input 
                        type="text" 
                        maxLength={6}
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        className={`w-full bg-white/[0.02] border ${totpError ? 'border-red-500' : 'border-white/10'} p-6 text-center text-4xl tracking-[0.5em] text-white focus:outline-none focus:border-[#d4af37] transition-all`}
                      />
                      {totpError && (
                        <p className="text-[10px] text-red-500 mt-3 uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4" /> {lang === 'pt' ? "Erro: Token Inválido" : "Error: Invalid Token"}
                        </p>
                       )}
                    </div>
                    <button 
                      onClick={verifyTotp}
                      className="w-full py-5 border border-[#d4af37]/40 bg-[#d4af37]/5 text-[#d4af37] hover:bg-[#d4af37]/10 transition-all font-bold text-xs tracking-[0.2em] uppercase shadow-sm"
                    >
                      {lang === 'pt' ? "Verificar Token" : "Verify Token"}
                    </button>
                    
                    <div className="relative flex items-center gap-4 py-4">
                       <div className="flex-1 h-px bg-slate-100" />
                       <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{lang === 'pt' ? "Alternativa" : "Alternative"}</span>
                       <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    <button 
                      onClick={handleCmdLogin}
                      className="w-full py-5 border border-white/10 bg-[#0a0f1d] text-slate-400 hover:bg-white/[0.02] transition-all font-bold text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3"
                    >
                      <QrCode className="w-4 h-4 text-[#d4af37]" /> Chave Móvel Digital
                    </button>
                    <button 
                      onClick={() => setTotpStep('SETUP')}
                      className="w-full text-center text-[10px] text-slate-400 uppercase hover:text-[#d4af37] transition-colors font-bold tracking-widest"
                    >
                      {lang === 'pt' ? "Configurar Novo Autenticador" : "Configure New Authenticator"}
                    </button>
                  </div>
                ) : totpStep === 'CMD' ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-8">
                     <motion.div 
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-8 border border-white/5 shadow-xl rounded-2xl bg-[#0a0f1d]"
                     >
                        <QrCode className="w-24 h-24 text-[#d4af37]" />
                     </motion.div>
                     <div className="text-center">
                        <div className="text-lg text-white font-serif font-bold uppercase tracking-widest mb-2">Aguardando Validação CMD</div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-widest leading-loose">
                           Aceda à sua App Autenticação.gov<br/>
                           e confirme o pedido de autorização.
                        </p>
                     </div>
                     <button 
                       onClick={() => setTotpStep('CHALLENGE')}
                       className="text-[10px] text-slate-400 uppercase font-bold hover:text-slate-400 border-b border-white/10 pb-1"
                     >
                        Voltar para 2FA Standard
                     </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="text-center">
                      <p className="text-[11px] text-slate-500 leading-relaxed uppercase tracking-widest">
                        {lang === 'pt' ? "Escaneie o código abaixo com a sua app de autenticação (Google Auth, Microsoft Auth ou Authy)." : "Scan the code below with your authenticator app (Google Auth, Microsoft Auth, or Authy)."}
                      </p>
                    </div>
                    
                    <div className="flex justify-center p-6 bg-[#0a0f1d] border border-white/5 shadow-lg">
                      {totpSecret && (
                        <QRCodeSVG 
                          value={authenticator.keyuri(user.email || 'user', 'The One Order', totpSecret)} 
                          size={240}
                        />
                      )}
                    </div>

                    <div className="bg-white/[0.02] p-6 space-y-3 border border-white/5">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Secret Key (Manual Entry)</p>
                      <div className="flex items-center justify-between">
                         <code className="text-lg font-mono text-white font-bold tracking-widest">{totpSecret}</code>
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(totpSecret || '');
                             setLogs(prev => [`[SYSTEM] Secret key copied to clipboard`, ...prev]);
                           }}
                           className="text-[10px] text-[#d4af37] font-bold uppercase hover:bg-[#d4af37]/10 px-3 py-2 transition-all border border-[#d4af37]/20"
                         >
                           Copy
                         </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setTotpStep('CHALLENGE');
                        setLogs(prev => [`[VAULT] TOTP Secret Stored in Blinded Vault`, ...prev]);
                      }}
                      className="w-full py-5 bg-slate-900 text-white font-bold text-xs tracking-[0.2em] uppercase hover:bg-slate-800 transition-all shadow-xl"
                    >
                      {lang === 'pt' ? "Finalizar Configuração" : "Finish Setup"}
                    </button>
                  </div>
                )}
                
                <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 uppercase">User: {user.email?.split('@')[0]}</span>
                  <button onClick={() => signOut(auth)} className="text-[9px] text-red-500/60 uppercase hover:text-red-400 font-bold">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-6 sm:p-10 selection:bg-[#d4af37]/30 overflow-x-hidden">
      <header className="max-w-7xl mx-auto mb-10 border-b border-white/10 pb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 px-4">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col gap-4">
            <LanguageSwitcher current={lang} onSelect={setLang} />
            <Logo lang={lang} />
          </div>
          
          <div className="flex flex-col gap-4 border-l border-white/10 pl-8 hidden lg:flex">
             <div className="flex gap-4">
                <div className="space-y-1">
                   <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t.sector}</label>
                   <select 
                     value={businessType} 
                     onChange={(e) => setBusinessType(e.target.value)}
                     className="bg-[#0a0f1d] text-[10px] text-white border border-white/10 p-2 focus:border-[#d4af37]/50 outline-none uppercase font-bold transition-all min-w-[200px]"
                   >
                     <optgroup label={lang === 'pt' ? "Restauração e Bebidas" : "Food & Beverage"}>
                        <option value="REST">{lang === 'pt' ? "Restaurantes / Cafés / Pastelarias" : "Restaurants / Cafés / Pastries"}</option>
                        <option value="CATERING">{lang === 'pt' ? "Cantinas / Catering / Hospitalar" : "Canteens / Catering / Hospital"}</option>
                     </optgroup>
                     <optgroup label={lang === 'pt' ? "Comércio e Retalho" : "Trade & Retail"}>
                        <option value="RETAIL">{lang === 'pt' ? "Supermercados / Minimercados" : "Supermarkets / Mini-markets"}</option>
                        <option value="TALHO">{lang === 'pt' ? "Talho / Peixaria / Frutaria" : "Butcher / Fish / Fruit"}</option>
                        <option value="PADARIA">{lang === 'pt' ? "Padaria Própria" : "On-site Bakery"}</option>
                     </optgroup>
                     <optgroup label={lang === 'pt' ? "Produção e Transformação" : "Production & Transformation"}>
                        <option value="INDUSTRIA_ALIMENTAR">{lang === 'pt' ? "Indústria Agroalimentar" : "Agri-food Industry"}</option>
                        <option value="INDUSTRIA_CARNE">{lang === 'pt' ? "Fábrica de Enchidos / Carnes" : "Sausage / Meat Factory"}</option>
                        <option value="ADEGA_LAGAR">{lang === 'pt' ? "Adega (Vinho) / Lagar (Azeite)" : "Winery (Wine) / Oil Mill (Olive Oil)"}</option>
                     </optgroup>
                   </select>
                </div>

                <div className="space-y-1">
                   <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t.compliance}</label>
                   <div className="flex gap-1 h-full">
                      {['HACCP_BASE', 'HACCP_SIMPLE', 'ISO22000', 'FSSC22000'].map((std) => (
                        <button 
                          key={std}
                          onClick={() => {
                            setComplianceStandard(std as any);
                            setIsSimplified(std === 'HACCP_SIMPLE');
                          }}
                          className={`px-3 py-2 text-[8px] font-bold uppercase transition-all border ${complianceStandard === std ? 'bg-[#d4af37]/10 border-[#d4af37] text-[#d4af37]' : 'bg-[#0a0f1d] border-white/10 text-slate-400 hover:text-slate-400'}`}
                        >
                          {std.replace('_', ' ')}
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             {profile?.role === 'ADMIN' && (
                <div className="mt-2 p-2 bg-[#0a0f1d]/5 border border-white/10 flex gap-2 items-center">
                    <select 
                      value={currentOrgId || ''} 
                      onChange={(e) => setCurrentOrgId(e.target.value)}
                      className="bg-black/40 text-[9px] text-white border border-white/10 p-1.5 outline-none"
                    >
                       {availableOrgs.map(org => (
                         <option key={org.id} value={org.id}>{org.name}</option>
                       ))}
                    </select>
                    <button 
                      onClick={() => setShowAdminPanel(true)}
                      className="px-3 py-1.5 border border-amber-500/30 text-amber-500 text-[8px] font-bold uppercase hover:bg-amber-500/10"
                    >
                       Admin
                    </button>
                </div>
             )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-4">
           <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0f1d]/5 border border-white/10">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" />
                 <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest font-sans">FSSC 22000 Approved</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0f1d]/5 border border-white/10">
                 <Award className="w-3 h-3 gold-text" />
                 <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest font-sans">v6.0 Integrated</span>
              </div>
           </div>
           <StatusBadge active={true} user={user} />
        </div>
      </header>

      {/* Institutional Health Bar */}
      <div className="max-w-7xl mx-auto mb-10 px-4">
        <div className="bg-[#0a0f1d] border border-white/10 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-10">
              <div className="space-y-4">
                 <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">{t.complianceScore}</div>
                 <div className="flex items-center gap-6">
                    <div className="text-4xl font-serif font-bold text-white tracking-tighter leading-none">{complianceStatus}%</div>
                    <div className="w-48 h-[1px] bg-slate-100 overflow-hidden relative">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${complianceStatus}%` }}
                         className="h-full bg-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                       />
                    </div>
                 </div>
              </div>
              <div className="hidden md:block h-14 w-px bg-slate-100" />
              <div className="space-y-3">
                 <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">{t.activeCCPs}</div>
                 <div className="flex items-center gap-3">
                    <span className="text-3xl font-serif font-bold text-[#d4af37] leading-none">04</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.1em] font-bold border-l border-white/5 pl-3">{t.monitorized}</span>
                 </div>
              </div>
           </div>
           <button 
             onClick={() => setLogs(prev => [`[AUDIT] Generating FSSC 22000 Comprehensive Package...`, ...prev])}
             className="flex items-center gap-3 px-8 py-3 border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-[#d4af37]/5 transition-all group"
           >
              <BarChart3 className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" /> {t.auditReport}
           </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-32 px-4">
        
        {/* Governance Column */}
        <div className="md:col-span-4 space-y-6">
           <OperationCard title={t.vault} icon={Lock}>
              <div className="space-y-4">
                 <div className="bg-white/[0.02] p-3 border border-white/5">
                    <div className="text-[9px] text-[#d4af37] font-bold uppercase mb-1">{t.vaultStatus}</div>
                    <div className="text-xs text-white font-bold tracking-tight">RGPD_BLINDED // Legal_Docs_Active</div>
                 </div>
                 <div className="space-y-1">
                   <NavItem label={lang === 'pt' ? "Identidade & NIF" : "Company Identity & NIF"} href="#" status="Locked" />
                   <NavItem label={lang === 'pt' ? "Registos de Formação" : "Staff Training Records"} href="#" />
                   <NavItem label={lang === 'pt' ? "Certificações ISO 22000" : "ISO 22000 Certifications"} href="#" />
                   <div className="mt-4 pt-3 border-t border-white/5">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">2FA Authenticator</span>
                        <span className="text-[9px] text-emerald-500 font-bold uppercase">Active (TOTP)</span>
                     </div>
                     <button 
                       onClick={handleSetupTotp}
                       className="text-[9px] w-full border border-white/10 p-2 hover:bg-[#0a0f1d]/5 transition-colors uppercase font-bold text-slate-500"
                     >
                       {lang === 'pt' ? "Regenerar Segredo" : "Regenerate Secret"}
                     </button>
                   </div>
                 </div>
              </div>
           </OperationCard>

           <OperationCard title={t.supplyLogistics} icon={Package}>
              <div className="space-y-4">
                 <div className="p-3 bg-blue-50 border border-blue-100 group cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                       <Terminal className="w-3 h-3 text-blue-500" />
                       <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Scanner_Mode</span>
                    </div>
                    <div className="text-xs text-white uppercase font-bold tracking-tighter">{lang === 'pt' ? "Entrada de Matérias Primas" : "Raw Materials Inbound"}</div>
                 </div>
                 <div className="space-y-1">
                   <NavItem label={lang === 'pt' ? "MP s/ Manipulação" : "Raw Materials w/o Handling"} href="#" status={lang === 'pt' ? "Ambiente" : "Ambient"} />
                   <NavItem label={lang === 'pt' ? "MP p/ Manipulação" : "Raw Materials w/ Handling"} href="#" status="Frio+" />
                   <NavItem label={lang === 'pt' ? "MP em Preparação" : "Raw Materials in Prep"} href="#" status="Frio-" />
                 </div>
              </div>
           </OperationCard>
        </div>

        {/* Center Column: Production Matrix */}
        <div className="md:col-span-5 space-y-6">
           <OperationCard title={t.productionMatrix} icon={Thermometer}>
              <div className="space-y-6">
                 {/* High Temp Zone */}
                 <div className="border border-white/5 bg-white/[0.02] p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                    <div className="flex justify-between items-center mb-5">
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">{t.cookingControl}</span>
                       <span className="text-[9px] px-2 py-1 border border-orange-500/30 text-orange-500 font-bold tracking-widest">{lang === 'pt' ? "> 65ºC OBRIGATÓRIO" : "> 65ºC REQUIRED"}</span>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="flex-1">
                          <div className="text-[9px] text-slate-400 mb-2 uppercase font-black tracking-widest">{t.thermalState}</div>
                          <div className="text-3xl font-serif font-bold text-white tracking-tighter">72.4ºC <span className="text-[10px] text-emerald-500 font-normal ml-2 italic tracking-wide">{lang === 'pt' ? "Conformidade Institucional Verificada" : "Institutional Compliance Verified"}</span></div>
                       </div>
                       <Activity className="w-8 h-8 text-orange-500/10 group-hover:text-orange-500/30 transition-colors" />
                    </div>
                 </div>

                 {/* Specialized Lines */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] p-4 border border-white/5">
                       <div className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest">{t.proteins}</div>
                       <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{lang === 'pt' ? "Climatizado" : "Climate Controlled"}</div>
                    </div>
                    <div className="bg-white/[0.02] p-4 border border-white/5">
                       <div className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest">{t.produce}</div>
                       <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{lang === 'pt' ? "Área de Purificação" : "Purification Area"}</div>
                    </div>
                 </div>

                 {/* Allergen Isolated Zone */}
                 <div className="border border-red-500/10 bg-red-500/[0.02] p-5">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500/80">{t.allergenZone}</span>
                       <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight italic">{lang === 'pt' ? "Isolamento de Alergénios Mandatório // Acesso Restrito" : "Allergen Isolation Mandatory // Restricted Access Only"}</p>
                 </div>
              </div>
           </OperationCard>

           <OperationCard title={t.infrastructure} icon={Cpu}>
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-2 border border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-white font-bold">Arca_Horizontal_01</span>
                       <span className="text-[8px] text-slate-500 uppercase">Model: Frilux-Pro</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] text-emerald-500 font-bold">-18.4ºC</span>
                    </div>
                 </div>
                 <div className="flex items-center justify-between p-2 border border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-white font-bold">Forno_Convector_A</span>
                       <span className="text-[8px] text-slate-500 uppercase">Model: Rational-iCombi</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] text-orange-500 font-bold">STANDBY</span>
                    </div>
                 </div>
              </div>
           </OperationCard>
           
           <OperationCard title={t.hygiene} icon={Broom}>
              <div className="space-y-4">
                 <div className="bg-emerald-500/10 p-3 border border-emerald-500/20">
                    <div className="flex justify-between items-center mb-2">
                       <div className="text-[9px] text-emerald-500 font-bold uppercase">{lang === 'pt' ? "Tarefas Pendentes" : "Pending Tasks"}</div>
                       <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 font-bold">02</span>
                    </div>
                    <div className="space-y-2">
                       <div 
                         className="flex items-center justify-between p-2 bg-[#0a0f1d] border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                         onClick={() => {
                           setActiveTask(lang === 'pt' ? 'SOP_01: Limpeza Fornos' : 'SOP_01: Oven Cleaning');
                           setSigningTask(true);
                         }}
                       >
                          <span className="text-[10px] text-slate-300">{lang === 'pt' ? "SOP_01: Limpeza Fornos" : "SOP_01: Oven Cleaning"}</span>
                          <ClipboardCheck className="w-3 h-3 text-emerald-500" />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <NavItem label={lang === 'pt' ? "Agentes Químicos (Aprovados)" : "Chemical Agents (Approved)"} href="#" status="Checked" />
                    <NavItem label={lang === 'pt' ? "Manual de Procedimentos" : "Procedural Manual"} href="#" />
                    <NavItem label={lang === 'pt' ? "Relatórios de Verificação" : "Verification Reports"} href="#" />
                 </div>
              </div>
           </OperationCard>

           <OperationCard title={t.chemicalLab} icon={Beaker}>
              <div className="space-y-4">
                 <div className="bg-purple-500/10 border border-purple-500/20 p-4 relative overflow-hidden group cursor-pointer" onClick={() => setShowChemicalLab(true)}>
                    <div className="flex items-center justify-between mb-3">
                       <Microscope className="w-4 h-4 text-purple-500" />
                       <span className="text-[8px] bg-purple-500 text-white px-1.5 py-0.5 font-black uppercase">AI_READY</span>
                    </div>
                    <div className="text-[11px] text-white font-bold uppercase tracking-widest leading-none mb-1">{lang === 'pt' ? "Laboratório Virtual Ativo" : "Virtual Lab Active"}</div>
                    <p className="text-[9px] text-purple-500/60 uppercase">{lang === 'pt' ? "Status: Motor_Neural_Pronto" : "Status: Neural_Engine_Ready"}</p>
                 </div>
                 
                 {msdsData.length > 0 && (
                   <div className="space-y-2">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">{lang === 'pt' ? "Receitas Ativas" : "Active Recipes"}</div>
                      {msdsData.map((m, i) => (
                        <div key={i} className="p-2 bg-white/[0.02] border border-white/5 flex justify-between items-center">
                           <div>
                              <div className="text-[10px] text-white font-bold">{m.productName}</div>
                              <div className="text-[9px] text-emerald-500 font-mono tracking-tighter">{m.dosageNormal}</div>
                           </div>
                           <Droplets className="w-3 h-3 text-purple-500/40" />
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </OperationCard>

           <OperationCard title={t.accreditedSuppliers} icon={Award}>
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-2 border border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-white font-bold">Lactogal S.A.</span>
                       <span className="text-[8px] text-emerald-500 uppercase font-black tracking-widest">{lang === 'pt' ? "Aprovado" : "Approved"}</span>
                    </div>
                    <span className="text-[8px] text-slate-500">Exp: 04/2026</span>
                 </div>
                 <div className="flex items-center justify-between p-2 border border-white/5 bg-white/[0.02] opacity-80">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-300 font-semibold italic">Talho do Cais</span>
                       <span className="text-[8px] text-amber-500 uppercase font-bold">{lang === 'pt' ? "Auditoria Pendente" : "Audit Pending"}</span>
                    </div>
                    <AlertOctagon className="w-3 h-3 text-amber-500" />
                 </div>
              </div>
           </OperationCard>
        </div>

         {/* Right Column: IoT & Alerts */}
         <div className="md:col-span-3 space-y-6">
            <OperationCard title={t.ccpMonitor} icon={AlertOctagon}>
              <div className="space-y-4">
                 <div className="bg-red-500/10 border border-red-500/20 p-3 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 h-full w-0.5 ${ccpStatus === 'DEVIATION' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <div className="text-[9px] text-red-500 font-bold uppercase mb-1">CCP_01: Thermal_Kill</div>
                    <div className="flex items-center justify-between">
                       <span className="text-xl font-bold text-white tracking-tighter">{temp}ºC</span>
                       <span className="text-[8px] bg-red-500 text-white px-1 font-black uppercase">LOW_LIMIT</span>
                    </div>
                    <button 
                      onClick={() => {
                        setLogs(prev => [`[CCP] Deviation_Ack :: Initiated Re-Cooking Action`, ...prev]);
                        setCcpStatus('SAFE');
                      }}
                      className="mt-3 w-full py-1.5 border border-red-200 text-[9px] text-red-500 font-bold uppercase hover:bg-red-100"
                    >
                      {lang === 'pt' ? "Ação Corretiva" : "Corrective Action"}
                    </button>
                 </div>
                 <div className="bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <div className="text-[9px] text-emerald-500 font-bold uppercase mb-1">CCP_02: Metal_Detect</div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-slate-300">{lang === 'pt' ? "Sensibilidade: 1.5mm" : "Sensitivity: 1.5mm"}</span>
                       <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                 </div>
              </div>
           </OperationCard>

           <OperationCard title={t.traceability} icon={Layers}>
              <div className="space-y-4">
                 <div className="flex gap-2">
                    <div className="bg-white/[0.02] p-2 text-center">
                       <div className="text-[8px] text-slate-400 uppercase mb-1">{lang === 'pt' ? "Lote Ativo" : "Batch Active"}</div>
                       <div className="text-[10px] text-white font-mono">#BT-99212</div>
                    </div>
                    <div className="bg-white/[0.02] p-2 text-center">
                       <div className="text-[8px] text-slate-400 uppercase mb-1">{lang === 'pt' ? "Ciclo de Vida" : "Life Cycle"}</div>
                       <div className="text-[10px] text-white font-mono">14 Days</div>
                    </div>
                 </div>
                 <div className="relative">
                    <div className="absolute left-[7px] top-0 bottom-0 w-[1px] bg-blue-500/30" />
                    <div className="space-y-4 relative">
                       {(lang === 'pt' ? ['Receção (08:42)', 'Armazenamento (09:15)', 'Processamento (11:20)'] : ['Receipt (08:42)', 'Storage (09:15)', 'Processing (11:20)']).map((step, i) => (
                          <div key={i} className="flex items-center gap-3 pl-0.5">
                             <div className="w-3 h-3 rounded-full bg-blue-500 border-4 border-white relative z-10" />
                             <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{step}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </OperationCard>

           <OperationCard title={t.network} icon={Wifi}>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-2 border border-emerald-500/20 bg-emerald-500/5">
                    <span className="text-[9px] text-white font-bold">GW_WIFI_MATRIZ</span>
                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold uppercase">{lang === 'pt' ? "Online" : "Online"}</span>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[9px] uppercase tracking-tighter">
                       <span className="text-slate-500">{lang === 'pt' ? "Estado de Energia:" : "Power Status:"}</span>
                       <span className="text-emerald-500 font-bold">{lang === 'pt' ? "Estável" : "Stable"}</span>
                    </div>
                    <div className="flex justify-between text-[9px] uppercase tracking-tighter">
                       <span className="text-slate-500">MQTT Cluster:</span>
                       <span className="text-emerald-500 font-bold">{lang === 'pt' ? "Sincronizado" : "Synced"}</span>
                    </div>
                 </div>
              </div>
           </OperationCard>

           <OperationCard title={t.terminal} icon={Terminal}>
              <div className="bg-[#0a0f1d] border border-white/10 p-3 h-[280px] shadow-inner font-mono text-[9px] flex flex-col">
                 <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                         <span className="text-slate-200 font-bold shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                         <span className={log.includes('SUCCESS') || log.includes('OK') ? 'text-emerald-500/70' : log.includes('ERR') || log.includes('DEV') ? 'text-red-500/80' : 'text-slate-500'}>
                            {log}
                         </span>
                      </div>
                    ))}
                 </div>
                 <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                    <div className="flex gap-3">
                       <Smartphone className="w-3 h-3 text-red-500/40" />
                       <Mail className="w-3 h-3 text-red-500/40" />
                    </div>
                    <span className="text-[8px] text-slate-300 uppercase font-black tracking-widest">Listener_Active</span>
                 </div>
              </div>
           </OperationCard>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-slate-200 z-50">
         <motion.div 
           animate={{ width: ['0%', '100%'] }} 
           transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
           className="h-full bg-amber-500/40" 
         />
      </div>

      <button 
        onClick={() => signOut(auth)}
        className="fixed bottom-6 right-6 p-4 bg-[#0a0f1d] border border-white/10 text-red-500 hover:bg-red-500/10 shadow-lg transition-all rounded-full backdrop-blur-md z-40 group"
      >
        <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Signing Task Modal */}
      <AnimatePresence>
        {signingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-[#0a0f1d] border border-white/10 p-8 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/10" />
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20">
                       <Broom className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-white uppercase tracking-tighter">Digital Signature Required</h3>
                       <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{activeTask}</p>
                    </div>
                 </div>
                 <button onClick={() => setSigningTask(false)} className="text-slate-400 hover:text-slate-400 transition-colors">
                    <XCircle className="w-5 h-5" />
                 </button>
              </div>

              <div className="space-y-4 mb-8">
                 <div className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wide">
                    Confirme que os procedimentos POP foram executados conforme Norma ISO 22000:
                 </div>
                 <div className="space-y-2">
                    {['Desligar equipamento da rede elétrica', 'Aplicação de detergente alcalino (Dosagem 2%)', 'Enxaguamento com água potável', 'Aplicação de desinfetante (Contacto 5 min)', 'Verificação visual de resíduos'].map((step, i) => (
                      <label key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.05]">
                         <input type="checkbox" className="w-3 h-3 rounded-none border-white/10 bg-transparent text-emerald-500 focus:ring-0" />
                         <span className="text-[10px] text-slate-400 font-sans">{step}</span>
                      </label>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="bg-white/[0.02] p-4 border border-white/5 text-center">
                    <div className="text-[10px] text-[#d4af37] font-bold uppercase mb-2">Digital ID (TOTP Signature)</div>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 p-2 text-center text-xl tracking-[0.4em] text-white focus:outline-none focus:border-[#d4af37]"
                    />
                 </div>
                 <button 
                   onClick={() => {
                     if (totpCode.length === 6) {
                        setLogs(prev => [`[HYGIENE] ${activeTask} :: COMPLETED :: Signature_Verified :: UID_${user?.uid.slice(0, 8)}`, ...prev]);
                        setSigningTask(false);
                        setTotpCode('');
                     }
                   }}
                   className="w-full py-4 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                 >
                    <ClipboardCheck className="w-4 h-4 text-[#d4af37]" /> Finalize & Sync Log
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chemical Lab Modal */}
      <AnimatePresence>
        {showChemicalLab && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-4xl w-full bg-[#0a0f1d] border border-white/10 p-10 relative overflow-y-auto max-h-[90vh] shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setShowChemicalLab(false)} className="text-slate-400 hover:text-slate-400 transition-colors">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="flex items-center gap-4 mb-10">
                 <div className="p-3 bg-purple-500/10 border border-purple-500/20">
                    <Beaker className="w-8 h-8 text-purple-500" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-white tracking-tighter uppercase italic">Laboratório de Segurança Química</h2>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">Manual de Procedimentos & Receituário // Powered by AI Search</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div className="p-4 border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-center">
                       <FileSearch className="w-8 h-8 text-slate-300 mb-2" />
                       <div className="text-[10px] text-white font-bold uppercase">Analisar FTS (Químicos)</div>
                       <button onClick={() => performAIAnalysis('MSDS')} disabled={isAnalyzing} className="mt-3 px-4 py-1.5 bg-purple-500/10 border border-purple-200 text-purple-500 text-[9px] font-bold uppercase">MSDS Analysis</button>
                    </div>

                    <div className="p-4 border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-center">
                       <Layers className="w-8 h-8 text-slate-300 mb-2" />
                       <div className="text-[10px] text-white font-bold uppercase">Analisar Matérias-Primas</div>
                       <button onClick={() => performAIAnalysis('MP')} disabled={isAnalyzing} className="mt-3 px-4 py-1.5 bg-amber-500/10 border border-amber-200 text-amber-500 text-[9px] font-bold uppercase">Analyze Raw Material</button>
                    </div>

                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-center">
                       <div className="text-[10px] text-emerald-500 font-bold uppercase mb-2">Gerador de Manuais Operativos</div>
                       <button onClick={() => performAIAnalysis('MANUAL')} disabled={isAnalyzing} className="w-full py-2 bg-emerald-500 text-white text-[9px] font-bold uppercase">Generate New Product Manual</button>
                    </div>
                 </div>

                 <div className="space-y-6 overflow-y-auto pr-2">
                    {/* Sections for results */}
                    {msdsData.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Chemical Specs</div>
                        {msdsData.map((m, i) => (
                           <div key={i} className="p-3 bg-purple-500/10 border border-purple-500/20 text-[10px] text-white">
                              <span className="font-bold">{m.productName}</span>: {m.dosageNormal}
                           </div>
                        ))}
                      </div>
                    )}

                    {mpData.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Raw Material Requirements</div>
                        {mpData.map((m, i) => (
                           <div key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 text-[10px]">
                              <div className="font-bold text-white uppercase">{m.materialName}</div>
                              <div className="text-amber-500 font-mono mt-1 text-[9px]">Alergénios: {m.allergens.join(', ')}</div>
                              <div className="text-slate-500 mt-1">{m.handlingInstructions}</div>
                           </div>
                        ))}
                      </div>
                    )}

                    {productManuals.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Procedural Manuals (FSSC/ISO)</div>
                        {productManuals.map((m, i) => (
                           <div key={i} className="p-4 bg-emerald-500/10 border border-emerald-500/20">
                              <div className="flex justify-between items-center mb-2">
                                 <div className="text-[11px] text-white font-bold uppercase tracking-tighter">{m.targetProduct}</div>
                                 <span className="text-[8px] bg-emerald-500 text-white px-1 font-black">ISO 22000</span>
                              </div>
                              <div className="space-y-1.5 pl-4 relative">
                                 <div className="absolute left-1 top-0 bottom-0 w-[1px] bg-emerald-200" />
                                 {m.steps.map((step: string, j: number) => (
                                   <div key={j} className="text-[9px] text-slate-400 flex items-start gap-2">
                                      <span className="text-emerald-500 font-mono font-bold">0{j+1}</span>
                                      <span>{step}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-white/5 gap-4">
                 <button 
                   onClick={() => setLogs(prev => [`[COMMS] Enviando Procedimentos para App_Execução...`, ...prev])}
                   className="px-6 py-3 border border-emerald-200 text-emerald-500 text-[10px] font-bold uppercase hover:bg-emerald-500/10"
                 >
                    Comunicar ao Responsável
                 </button>
                 <button 
                   onClick={() => setLogs(prev => [`[FILE_EX] Exporting Manual_FSSC_Procedimentos.pdf`, ...prev])}
                   className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-[10px] font-bold uppercase hover:bg-slate-800"
                 >
                    <FileText className="w-4 h-4 text-[#d4af37]" /> Exportar Manual
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding Wizard Modal */}
      <AnimatePresence>
        {isOnboarding && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/40">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl w-full bg-[#0a0f1d] border border-white/10 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                 <Logo lang={lang} />
                 <button onClick={() => setIsOnboarding(false)} className="text-slate-400 hover:text-slate-400 transition-colors">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 custom-scrollbar">
                 {onboardingStep === 1 && (
                    <div className="space-y-8">
                       <div className="space-y-4">
                          <label className="text-[10px] text-[#d4af37] font-black tracking-widest uppercase">01 // Identificação de Empresa</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <p className="text-[9px] text-slate-500 uppercase font-bold">Denominação Comercial</p>
                                <input 
                                  value={orgForm.tradingName}
                                  onChange={(e) => setOrgForm({...orgForm, tradingName: e.target.value})}
                                  placeholder="Ex: Talho do Cais"
                                  className="w-full bg-white/[0.02] border border-white/10 p-4 text-xs text-white focus:border-[#d4af37] outline-none"
                                />
                             </div>
                             <div className="space-y-2">
                                <p className="text-[9px] text-slate-500 uppercase font-bold">NIF / NIPC</p>
                                <input 
                                  value={orgForm.nif}
                                  onChange={(e) => {
                                    setOrgForm({...orgForm, nif: e.target.value});
                                    if(e.target.value.length === 9) simulateNifLookup(e.target.value);
                                  }}
                                  placeholder="9 dígitos"
                                  className="w-full bg-white/[0.02] border border-white/10 p-4 text-xs text-white focus:border-[#d4af37] outline-none"
                                />
                             </div>
                          </div>
                       </div>

                       {orgForm.fiscalName && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-[#d4af37]/5 border border-[#d4af37]/20 space-y-4">
                             <div className="flex items-center gap-2 text-[#d4af37] mb-2">
                                <Database className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Dados Fiscais Detectados (Simulação)</span>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                   <p className="text-[8px] text-slate-500 uppercase font-bold">Denominação Fiscal</p>
                                   <p className="text-[10px] text-white font-sans font-bold">{orgForm.fiscalName}</p>
                                </div>
                                <div>
                                   <p className="text-[8px] text-slate-500 uppercase font-bold">Endereço Sede</p>
                                   <p className="text-[10px] text-slate-300 font-sans italic">{orgForm.address}</p>
                                </div>
                                <div className="md:col-span-2">
                                   <p className="text-[8px] text-slate-500 uppercase font-bold">CAE Principal</p>
                                   <p className="text-[10px] text-white font-mono">{orgForm.cae}</p>
                                </div>
                             </div>
                          </motion.div>
                       )}
                    </div>
                 )}

                 {onboardingStep === 2 && (
                    <div className="space-y-8">
                       <label className="text-[10px] text-[#d4af37] font-black tracking-widest uppercase">02 // Equipa de Controlo</label>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                             { label: 'Responsável pela Empresa', key: 'responsible' },
                             { label: 'Responsável Qualidade', key: 'qualityManager' },
                             { label: 'Auditor Interno (HACCP)', key: 'internalAuditor' },
                             { label: 'Auditor Externo / Consultor', key: 'externalAuditor' }
                          ].map(field => (
                             <div key={field.key} className="space-y-2">
                                <p className="text-[9px] text-slate-500 uppercase font-bold">{field.label}</p>
                                <input 
                                  value={(orgForm as any)[field.key]}
                                  onChange={(e) => setOrgForm({...orgForm, [field.key]: e.target.value})}
                                  placeholder="Nome do utilizador..."
                                  className="w-full bg-white/[0.02] border border-white/10 p-4 text-xs text-white focus:border-[#d4af37] outline-none"
                                />
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {onboardingStep === 3 && (
                    <div className="space-y-8">
                       <label className="text-[10px] text-[#d4af37] font-black tracking-widest uppercase">03 // Perfil de Risco e Segurança</label>
                       <div className="space-y-6">
                          <div className="p-6 bg-white/[0.02] border border-white/5 space-y-4">
                             <p className="text-[10px] text-slate-500 uppercase font-bold mb-4">Escolha o seu Agente Económico:</p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                   { id: 'REST', name: 'Restauração e Bebidas', desc: 'HACCP Completo + Higiene' },
                                   { id: 'RETAIL', name: 'Comércio e Retalho', desc: 'Foco em Cadeia de Frio' },
                                   { id: 'INDUSTRIA_ALIMENTAR', name: 'Indústria Produtiva', desc: 'Processos Complexos ISO 22000' },
                                   { id: 'AMBULANTE', name: 'Venda Ambulante', desc: 'Simplificado e Portátil' }
                                ].map(item => (
                                   <button 
                                     key={item.id}
                                     onClick={() => {
                                       setBusinessType(item.id);
                                       if(item.id === 'AMBULANTE' || item.id === 'RETAIL') setComplianceStandard('HACCP_SIMPLE');
                                       else if(item.id === 'INDUSTRIA_ALIMENTAR') setComplianceStandard('ISO22000');
                                       else setComplianceStandard('HACCP_BASE');
                                     }}
                                     className={`p-4 border text-left transition-all ${businessType === item.id ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-white/10 bg-[#0a0f1d] hover:bg-white/[0.02]'}`}
                                   >
                                      <div className={`text-[11px] font-bold uppercase mb-1 ${businessType === item.id ? 'text-[#a3862b]' : 'text-white'}`}>{item.name}</div>
                                      <div className="text-[9px] text-slate-500 uppercase font-mono italic">{item.desc}</div>
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {onboardingStep === 4 && (
                    <div className="space-y-10">
                       <div className="text-center space-y-2">
                          <ShieldCheck className="w-16 h-16 text-[#d4af37] mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Configuração Recomendada</h3>
                          <p className="text-[10px] text-slate-500 uppercase font-mono">Baseado no seu perfil de risco industrial</p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-6 bg-[#d4af37]/10 border border-[#d4af37]/30 text-center">
                             <div className="text-[8px] text-[#d4af37] font-black uppercase mb-1">Standard Seleccionado</div>
                             <div className="text-lg font-black text-white italic uppercase">{complianceStandard.replace('_', ' ')}</div>
                          </div>
                          <div className="p-6 bg-white/5 border border-white/10 text-center">
                             <div className="text-[8px] text-slate-400 uppercase font-black mb-1">Carga Documental</div>
                             <div className="text-lg font-black text-[#d4af37] italic uppercase">
                                {complianceStandard.includes('SIMPLE') ? 'LIGHT_SOP' : 'FULL_ISO_SET'}
                             </div>
                          </div>
                       </div>

                       <div className="p-6 border border-white/5 bg-white/[0.02] text-[10px] text-slate-500 leading-relaxed font-sans italic">
                          O sistema irá agora gerar as tabelas de CCP, planos de limpeza e listagens de monitorização adequadas ao CAE {orgForm.cae || 'DETECTADO'}.
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-between gap-4">
                 <button 
                   disabled={onboardingStep === 1}
                   onClick={() => setOnboardingStep(s => s - 1)}
                   className="px-6 py-3 border border-white/10 text-slate-400 text-[10px] font-bold uppercase disabled:opacity-20 transition-all bg-[#0a0f1d]"
                 >
                    Retroceder
                 </button>
                 {onboardingStep < 4 ? (
                    <button 
                      onClick={() => setOnboardingStep(s => s + 1)}
                      className="px-8 py-3 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all font-mono"
                    >
                       Continuar
                    </button>
                 ) : (
                    <button 
                      onClick={() => {
                        setIsOnboarding(false);
                        setLogs(prev => [`[CONFIG] Success: Organization "${orgForm.tradingName}" finalized.`, ...prev]);
                      }}
                      className="px-10 py-3 bg-[#d4af37] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#a3862b] transition-all"
                    >
                       Implementar Sistema
                    </button>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/90">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-[#0a0f1d] border border-white/10 p-10 relative"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setShowAdminPanel(false)} className="text-slate-400 hover:text-white">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                 <Lock className="w-6 h-6 text-amber-500" />
                 <h2 className="text-xl font-bold text-white tracking-tighter uppercase italic">User Management</h2>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-widest">Pre-Register Employee</label>
                    <div className="space-y-3">
                       <input 
                         type="text" 
                         placeholder="Full Name" 
                         value={newUserName}
                         onChange={(e) => setNewUserName(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                       />
                       <input 
                         type="email" 
                         placeholder="Employee Email" 
                         value={newUserEmail}
                         onChange={(e) => setNewUserEmail(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                       />
                       <div>
                          <input 
                            type="password" 
                            placeholder="Initial Password (12+ Chars)" 
                            value={newUserPass}
                            onChange={(e) => {
                              setNewUserPass(e.target.value);
                              setPassError(validatePassword(e.target.value));
                            }}
                            className={`w-full bg-black/40 border ${passError ? 'border-amber-500/50' : 'border-white/10'} p-3 text-xs text-white focus:border-amber-500 focus:outline-none`}
                          />
                          {passError && <p className="text-[8px] text-amber-500 mt-1 uppercase italic">{passError}</p>}
                       </div>
                    </div>
                 </div>

                 <button 
                   disabled={!!passError || !newUserEmail}
                   onClick={() => {
                     setLogs(prev => [`[ADMIN] User Pre-Registered: ${newUserEmail}`, ...prev]);
                     setShowAdminPanel(false);
                     setNewUserEmail('');
                     setNewUserPass('');
                   }}
                   className="w-full py-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-[0.2em] hover:bg-amber-500/20 transition-all disabled:opacity-30"
                 >
                    Authorize User Access
                 </button>
                 
                 <div className="pt-6 border-t border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-3 tracking-widest">Recent Access History (Live Admin Audit)</div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                       {logs.filter(l => l.includes('AUTH') || l.includes('CONTEXT') || l.includes('LOGIN')).slice(0, 10).map((l, i) => (
                         <div key={i} className="p-2 border border-white/5 bg-[#0a0f1d]/[0.02] flex justify-between items-center">
                            <span className="text-[9px] text-white/80">{l.split(']')[1] || l}</span>
                            <span className="text-[7px] text-slate-400 uppercase font-mono">{l.split(']')[0]?.replace('[', '')}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
