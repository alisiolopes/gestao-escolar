import { useMemo, useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import logoRedencao from "./assets/logo-redencao.png";

import { sendPasswordResetEmail } from "firebase/auth";

import { FiMail, FiLock, FiEye, FiEyeOff, FiSun, FiMoon } from "react-icons/fi";

import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import "./App.css";
import * as XLSX from "xlsx";

const initialGrades = [
  "6º ano A",
  "6º ano B",
  "6º ano C",
  "7º ano A",
  "7º ano B",
  "7º ano C",
  "7º ano D",
  "8º ano A",
  "8º ano B",
  "8º ano C",
  "9º ano A",
  "9º ano B",
  "9º ano C",
  "9º ano D",
];

const emptyStudent = {
  nome: "",
  sige: "",
  censo: "",
  nomePai: "",
  nomeMae: "",
  nomeResponsavel: "",
  telefonePais: "",
  cpf: "",
  rg: "",
  corRaca: "",
  nascimento: "",
  transporte: false,
  transporteTipo: "",
  sus: "",
  situacaoVacina: "sim",
  faltaVacina: "",
  historicoEscolar: "nao",
  sexo: "",
  serie: "",
  anoLetivo: String(new Date().getFullYear()),
};

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [grades, setGrades] = useState([]);

  const [students, setStudents] = useState([]);

  const [history, setHistory] = useState([]);

  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newEmail: "",
    newPassword: "",
  });

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [userProfile, setUserProfile] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success", // success | error
  });

  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [loginLoading, setLoginLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [capsLockOn, setCapsLockOn] = useState(false);

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark",
  );

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }

    console.log("UID logado:", user.uid);

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        console.log("Documento existe?", snapshot.exists());
        console.log("Dados do perfil:", snapshot.data());

        if (snapshot.exists()) {
          setUserProfile(snapshot.data());
        } else {
          setUserProfile(null);
        }
      },
      (error) => {
        console.error("Erro ao ler perfil:", error);
        setUserProfile(null);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && justLoggedIn) {
      showToast("Login efetuado com sucesso.", "success");
      setJustLoggedIn(false);
    }
  }, [user, justLoggedIn]);

  async function handleLogin(e) {
    e.preventDefault();

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      showToast("Preencha email e senha.", "error");
      return;
    }

    try {
      setLoginLoading(true);

      await signInWithEmailAndPassword(
        auth,
        loginForm.email.trim(),
        loginForm.password,
      );

      setJustLoggedIn(true);
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        showToast("E-mail ou senha incorreta.", "error");
        return;
      }

      if (error.code === "auth/too-many-requests") {
        showToast(
          "Muitas tentativas. Aguarde um pouco e tente novamente.",
          "error",
        );
        return;
      }

      if (error.code === "auth/network-request-failed") {
        showToast("Erro de conexão. Verifique sua internet.", "error");
        return;
      }

      showToast("Erro ao fazer login.", "error");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!loginForm.email.trim()) {
      showToast("Digite seu e-mail para recuperar a senha.", "error");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, loginForm.email.trim());

      showToast("E-mail de recuperação enviado.", "success");
    } catch (error) {
      showToast("Não foi possível enviar o e-mail de recuperação.", "error");
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  async function handleChangeEmail(e) {
    e.preventDefault();

    if (!securityForm.currentPassword || !securityForm.newEmail) {
      showAlert("Preencha senha atual e novo e-mail.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        securityForm.currentPassword,
      );

      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, securityForm.newEmail);

      showAlert("E-mail atualizado com sucesso.");

      setSecurityForm({
        currentPassword: "",
        newEmail: "",
        newPassword: "",
      });
    } catch (error) {
      console.error(error);
      showAlert("Não foi possível atualizar o e-mail.");
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (!securityForm.currentPassword || !securityForm.newPassword) {
      showAlert("Preencha senha atual e nova senha.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        securityForm.currentPassword,
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, securityForm.newPassword);

      showAlert("Senha atualizada com sucesso.");

      setSecurityForm({
        currentPassword: "",
        newEmail: "",
        newPassword: "",
      });
    } catch (error) {
      console.error(error);
      showAlert("Não foi possível atualizar a senha.");
    }
  }

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const studentsData = snapshot.docs.map((docItem) => ({
          ...docItem.data(),
          id: docItem.id,
        }));

        setStudents(studentsData);
      },
      (error) => {
        console.error("Erro ao ler alunos:", error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "grades"),
      (snapshot) => {
        console.log("Total de docs em grades:", snapshot.docs.length);

        const uniqueGradesMap = new Map();

        snapshot.docs.forEach((docItem) => {
          const data = docItem.data();
          console.log("Documento de grade:", data);

          const nome = data.nome?.trim();

          if (nome && !uniqueGradesMap.has(nome)) {
            uniqueGradesMap.set(nome, nome);
          }
        });

        const orderedGrades = Array.from(uniqueGradesMap.values()).sort(
          (a, b) => a.localeCompare(b, "pt-BR"),
        );

        console.log("Grades finais:", orderedGrades);
        setGrades(orderedGrades);
      },
      (error) => {
        console.error("Erro ao ler grades:", error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "history"),
      (snapshot) => {
        const historyData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        historyData.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );

        setHistory(historyData);
      },
      (error) => {
        console.error("Erro ao ler histórico:", error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const [search, setSearch] = useState("");
  const [serieFiltro, setSerieFiltro] = useState("Todas");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newGrade, setNewGrade] = useState("");
  const [formData, setFormData] = useState(emptyStudent);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState("");
  const [seriesEditMode, setSeriesEditMode] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [editedGradeName, setEditedGradeName] = useState("");
  const [dashboardFilter, setDashboardFilter] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [onlyPendingVaccine, setOnlyPendingVaccine] = useState(false);
  const [filterTransport, setFilterTransport] = useState(false);
  const [filterGender, setFilterGender] = useState(null);
  // null | "masculino" | "feminino"
  const [openSeries, setOpenSeries] = useState(null);
  const [alertModal, setAlertModal] = useState({
    open: false,
    message: "",
  });

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    message: "",
    onConfirm: null,
  });
  const [dashboardYearFilter, setDashboardYearFilter] = useState(
    String(new Date().getFullYear()),
  );

  function showToast(message, type = "success") {
    setToast({
      open: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast({
        open: false,
        message: "",
        type: "success",
      });
    }, 2500);
  }

  function closeToast() {
    setToast({
      open: false,
      message: "",
      type: "success",
    });
  }

  async function addHistory(action, studentName) {
    const now = new Date();

    const entry = {
      action,
      studentName,
      user: userProfile?.nome || user?.email,
      role: userProfile?.cargo || "Usuário",
      dataHora: now.toLocaleString("pt-BR"),
      timestamp: now.toISOString(),
    };

    try {
      await addDoc(collection(db, "history"), entry);
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
    }
  }

  const activeStudents = students.filter((student) => !student.archived);
  const archivedStudents = students.filter((student) => student.archived);

  const displayedStudents = useMemo(() => {
    const base = showArchived ? archivedStudents : activeStudents;

    return base
      .filter((student) => {
        const text = search.toLowerCase();

        const matchSearch =
          student.nome.toLowerCase().includes(text) ||
          student.sige.toLowerCase().includes(text) ||
          student.cpf.toLowerCase().includes(text) ||
          student.rg?.toLowerCase().includes(text);

        const matchSerie =
          serieFiltro === "Todas" ? true : student.serie === serieFiltro;

        const matchVaccine = onlyPendingVaccine
          ? student.situacaoVacina === "nao"
          : true;

        const matchTransport = filterTransport
          ? student.transporte === true
          : true;

        const matchGender = filterGender ? student.sexo === filterGender : true;

        return (
          matchSearch &&
          matchSerie &&
          matchVaccine &&
          matchTransport &&
          matchGender
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [activeStudents, archivedStudents, search, serieFiltro, showArchived]);

  const studentsPerPage = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(displayedStudents.length / studentsPerPage),
  );

  const activeFilterLabel = (() => {
    if (onlyPendingVaccine) return "vacina pendente";
    if (filterTransport) return "alunos que usam transporte";
    if (filterGender === "masculino") return "meninos";
    if (filterGender === "feminino") return "meninas";
    if (showArchived) return "alunos arquivados";
    return null;
  })();

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const resultsLabel = (() => {
    if (displayedStudents.length === 0) {
      return "0 de 0 alunos";
    }

    const start = (safeCurrentPage - 1) * studentsPerPage + 1;
    const end = Math.min(
      safeCurrentPage * studentsPerPage,
      displayedStudents.length,
    );
    const noun = displayedStudents.length === 1 ? "aluno" : "alunos";

    return `${start}–${end} de ${displayedStudents.length} ${noun}`;
  })();

  const paginatedStudents = displayedStudents.slice(
    (safeCurrentPage - 1) * studentsPerPage,
    safeCurrentPage * studentsPerPage,
  );

  const availableSchoolYears = useMemo(() => {
    const yearsFromStudents = students
      .map((student) => student.anoLetivo)
      .filter(Boolean);

    const currentYear = String(new Date().getFullYear());

    return ["Todos", ...new Set([currentYear, ...yearsFromStudents])].sort(
      (a, b) =>
        a === "Todos" ? -1 : b === "Todos" ? 1 : Number(b) - Number(a),
    );
  }, [students]);

  const dashboardStudents = useMemo(() => {
    if (dashboardYearFilter === "Todos") {
      return activeStudents;
    }

    return activeStudents.filter(
      (student) => student.anoLetivo === dashboardYearFilter,
    );
  }, [activeStudents, dashboardYearFilter]);

  const stats = useMemo(() => {
    const total = dashboardStudents.length;
    const transporte = dashboardStudents.filter((s) => s.transporte).length;
    const vacinaPendente = dashboardStudents.filter(
      (s) => s.situacaoVacina === "nao",
    ).length;

    const meninos = dashboardStudents.filter(
      (s) => (s.sexo || "").toLowerCase() === "masculino",
    ).length;

    const meninas = dashboardStudents.filter(
      (s) => (s.sexo || "").toLowerCase() === "feminino",
    ).length;

    const porSerie = grades.map((grade) => {
      const total = dashboardStudents.filter(
        (s) =>
          (s.serie || "").trim().toLowerCase() === grade.trim().toLowerCase(),
      ).length;

      return {
        serie: grade,
        total,
      };
    });

    return { total, transporte, vacinaPendente, meninos, meninas, porSerie };
  }, [dashboardStudents, grades]);

  const vaccinePendingPercent =
    stats.total > 0 ? (stats.vacinaPendente / stats.total) * 100 : 0;

  const vaccinePendingLabel =
    stats.vacinaPendente === 1
      ? "1 aluno com vacina pendente"
      : `${stats.vacinaPendente} alunos com vacina pendente`;

  const genderChartData = [
    { name: "Meninos", value: stats.meninos },
    { name: "Meninas", value: stats.meninas },
  ];

  const genderChartColors = ["#3b82f6", "#ec4899"];

  const dashboardSeries = stats.porSerie.filter((item) => {
    const matchesFilter =
      dashboardFilter === "Todas" || item.serie.startsWith(dashboardFilter);

    return matchesFilter && item.total > 0;
  });

  const dashboardGroupedSeries = {
    "6º ano": stats.porSerie.filter((item) =>
      (item.serie || "").trim().toLowerCase().startsWith("6º"),
    ),
    "7º ano": stats.porSerie.filter((item) =>
      (item.serie || "").trim().toLowerCase().startsWith("7º"),
    ),
    "8º ano": stats.porSerie.filter((item) =>
      (item.serie || "").trim().toLowerCase().startsWith("8º"),
    ),
    "9º ano": stats.porSerie.filter((item) =>
      (item.serie || "").trim().toLowerCase().startsWith("9º"),
    ),
  };
  const studentsFromSelectedSeries = useMemo(() => {
    if (!selectedSeries) return [];
    return activeStudents.filter((student) => student.serie === selectedSeries);
  }, [activeStudents, selectedSeries]);

  function formatCPF(value) {
    const numbers = value.replace(/\D/g, "").slice(0, 11);

    return numbers
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  function formatRG(value) {
    return value
      .replace(/[^0-9a-zA-Z]/g, "")
      .slice(0, 14)
      .toUpperCase();
  }

  function formatPhone(value) {
    const numbers = value.replace(/\D/g, "").slice(0, 11);

    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function calcularIdade(dataNascimento) {
    if (!dataNascimento) return "-";

    const hoje = new Date();
    const nascimento = new Date(dataNascimento);

    if (Number.isNaN(nascimento.getTime())) return "-";

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return `${idade} anos`;
  }

  function formatarData(data) {
    if (!data) return "-";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function capitalizeWords(text) {
    const excecoes = ["da", "de", "do", "das", "dos", "e"];

    return text
      .toLowerCase()
      .split(" ")
      .map((palavra, index) => {
        if (excecoes.includes(palavra) && index !== 0) {
          return palavra;
        }

        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(" ");
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;

    if (name === "situacaoVacina") {
      setFormData((prev) => ({
        ...prev,
        situacaoVacina: value,
        faltaVacina: value === "sim" ? "" : prev.faltaVacina,
      }));
      return;
    }

    if (name === "transporte") {
      const usaTransporte = value === "sim";

      setFormData((prev) => ({
        ...prev,
        transporte: usaTransporte,
        transporteTipo: usaTransporte ? prev.transporteTipo : "",
      }));
      return;
    }

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    let formattedValue = value;

    if (name === "cpf") {
      formattedValue = formatCPF(value);
    }

    if (name === "rg") {
      formattedValue = formatRG(value);
    }

    if (name === "telefonePais") {
      formattedValue = formatPhone(value);
    }

    if (
      name === "nome" ||
      name === "nomePai" ||
      name === "nomeMae" ||
      name === "nomeResponsavel"
    ) {
      formattedValue = capitalizeWords(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  }

  function openNewStudentForm() {
    setEditingId(null);
    setSelectedStudent(null);
    setFormData({
      ...emptyStudent,
      serie: grades[0] || "",
    });
    setShowForm(true);
  }

  function openEditStudentForm(student) {
    setEditingId(student.id);
    setSelectedStudent(null);
    setFormData(student);
    setShowForm(true);
  }

  function openViewStudent(student) {
    setSelectedStudent(student);
    setShowForm(false);
    setEditingId(null);
  }

  function closePanels() {
    setSelectedStudent(null);
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyStudent);
  }

  async function handleSaveStudent(e) {
    e.preventDefault();

    if (!formData.nome.trim()) {
      showAlert("Preencha o nome do aluno.");
      return;
    }

    if (!formData.serie) {
      showAlert("Selecione uma série.");
      return;
    }

    if (!formData.anoLetivo) {
      showAlert("Selecione o ano letivo.");
      return;
    }

    if (isDuplicateStudent(formData, editingId)) {
      showAlert(
        "Já existe um aluno cadastrado com esse SIGE ou com o mesmo nome e data de nascimento.",
      );
      return;
    }

    if (formData.situacaoVacina === "nao" && !formData.faltaVacina.trim()) {
      showAlert("Informe qual vacina está pendente.");
      return;
    }

    if (formData.transporte && !formData.transporteTipo.trim()) {
      showAlert("Informe qual é o transporte utilizado.");
      return;
    }

    try {
      if (editingId) {
        const studentRef = doc(db, "students", editingId);
        await updateDoc(studentRef, {
          ...formData,
        });
        addHistory("editou", formData.nome);
      } else {
        await addDoc(collection(db, "students"), {
          ...formData,
          archived: false,
        });
        addHistory("cadastrou", formData.nome);
      }

      closePanels();
      setActivePage("alunos");
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      showAlert(`Não foi possível salvar o aluno: ${error.message}`);
    }
  }

  function goToSeries(serie) {
    setOnlyPendingVaccine(false);
    setSerieFiltro(serie);
    setCurrentPage(1);
    setActivePage("alunos");
  }

  function goToPendingVaccines() {
    resetStudentFilters();
    setOnlyPendingVaccine(true);
    setActivePage("alunos");
  }

  function goToTransport() {
    resetStudentFilters();
    setFilterTransport(true);
    setActivePage("alunos");
  }

  function goToBoys() {
    resetStudentFilters();
    setFilterGender("masculino");
    setActivePage("alunos");
  }

  function goToGirls() {
    resetStudentFilters();
    setFilterGender("feminino");
    setActivePage("alunos");
  }

  function goToArchived() {
    resetStudentFilters();
    setShowArchived(true);
    setActivePage("alunos");
  }

  function goToAllStudents() {
    resetStudentFilters();
    setActivePage("alunos");
  }

  function resetStudentFilters() {
    setOnlyPendingVaccine(false);
    setFilterTransport(false);
    setFilterGender(null);
    setShowArchived(false);
    setSerieFiltro("Todas");
    setSearch("");
    setCurrentPage(1);
  }

  function handleArchiveStudent(id) {
    askConfirm("Deseja arquivar este aluno?", async () => {
      try {
        const student = students.find((s) => s.id === id);
        if (student) addHistory("arquivou", student.nome);

        const studentRef = doc(db, "students", id);
        await updateDoc(studentRef, { archived: true });

        if (selectedStudent?.id === id) {
          setSelectedStudent(null);
        }
      } catch (error) {
        console.error(error);
        showAlert("Não foi possível arquivar o aluno.");
      }
    });
  }

  async function handleRestoreStudent(id) {
    try {
      const student = students.find((s) => s.id === id);
      if (student) addHistory("restaurou", student.nome);

      const studentRef = doc(db, "students", id);
      await updateDoc(studentRef, { archived: false });
    } catch (error) {
      console.error(error);
      showAlert("Não foi possível restaurar o aluno.");
    }
  }

  function handleDeleteStudent(id) {
    askConfirm(
      "Deseja excluir este aluno permanentemente? Essa ação não poderá ser desfeita.",
      async () => {
        try {
          const student = students.find((s) => s.id === id);
          if (student) addHistory("excluiu", student.nome);

          const studentRef = doc(db, "students", id);
          await deleteDoc(studentRef);

          if (selectedStudent?.id === id) {
            setSelectedStudent(null);
          }
          if (editingId === id) {
            closePanels();
          }
        } catch (error) {
          console.error(error);
          showAlert("Não foi possível excluir o aluno.");
        }
      },
    );
  }

  function exportStudentsCSV() {
    const rows = students.map((s) => ({
      Nome: s.nome || "",
      SIGE: s.sige || "",
      Censo: s.censo || "",
      "Nome do pai": s.nomePai || "",
      "Nome da mãe": s.nomeMae || "",
      "Nome do responsável": s.nomeResponsavel || "",
      "Telefone dos pais": s.telefonePais || "",
      CPF: String(s.cpf || ""),
      RG: String(s.rg || ""),
      "Cor/Raça": s.corRaca || "",
      Nascimento: s.nascimento ? formatarData(s.nascimento) : "",
      SUS: String(s.sus || ""),
      Transporte: s.transporte ? "Sim" : "Não",
      "Tipo de transporte": s.transporteTipo || "",
      "Situação vacinal": s.situacaoVacina === "nao" ? "Não" : "Sim",
      "Vacina pendente": s.faltaVacina || "",
      "Histórico escolar": s.historicoEscolar === "sim" ? "Sim" : "Não",
      Sexo: s.sexo || "",
      Série: s.serie || "",
      Arquivado: s.archived ? "Sim" : "Não",
      "Ano letivo": s.anoLetivo || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    XLSX.writeFile(workbook, "alunos.xlsx");
  }

  function exportFilteredStudentsCSV() {
    if (displayedStudents.length === 0) {
      showAlert("Nenhum aluno encontrado para exportar.");
      return;
    }

    const rows = displayedStudents.map((s) => ({
      Nome: s.nome || "",
      SIGE: s.sige || "",
      Censo: s.censo || "",
      "Nome do pai": s.nomePai || "",
      "Nome da mãe": s.nomeMae || "",
      "Nome do responsável": s.nomeResponsavel || "",
      "Telefone dos pais": s.telefonePais || "",
      CPF: String(s.cpf || ""),
      RG: String(s.rg || ""),
      "Cor/Raça": s.corRaca || "",
      Nascimento: s.nascimento ? formatarData(s.nascimento) : "",
      SUS: String(s.sus || ""),
      Transporte: s.transporte ? "Sim" : "Não",
      "Tipo de transporte": s.transporteTipo || "",
      "Vacina declarada": s.situacaoVacina === "nao" ? "Não" : "Sim",
      "Vacina pendente": s.faltaVacina || "",
      "Histórico escolar": s.historicoEscolar === "sim" ? "Sim" : "Não",
      Sexo: s.sexo || "",
      Série: s.serie || "",
      Arquivado: s.archived ? "Sim" : "Não",
      "Ano letivo": s.anoLetivo || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");

    const fileName =
      serieFiltro !== "Todas"
        ? `alunos_${serieFiltro.replace(/\s+/g, "_")}.xlsx`
        : "alunos_filtrados.xlsx";

    XLSX.writeFile(workbook, fileName);
  }

  async function handleAddGrade() {
    const gradeTrimmed = newGrade.trim();

    console.log("Tentando adicionar série:", gradeTrimmed);

    if (!gradeTrimmed) {
      showAlert("Digite o nome da série.");
      return;
    }

    if (grades.includes(gradeTrimmed)) {
      showAlert("Essa série já existe.");
      return;
    }

    try {
      const gradesRef = collection(db, "grades");
      const q = query(gradesRef, where("nome", "==", gradeTrimmed));
      const snapshot = await getDocs(q);

      console.log("Já existe no banco?", !snapshot.empty);

      if (!snapshot.empty) {
        showAlert("Essa série já existe.");
        return;
      }

      const docRef = await addDoc(gradesRef, {
        nome: gradeTrimmed,
      });

      console.log("Série salva com ID:", docRef.id);

      setNewGrade("");
      showAlert("Série adicionada com sucesso.");
    } catch (error) {
      console.error("Erro ao adicionar série:", error);
      showAlert("Não foi possível adicionar a série.");
    }
  }

  function handleStartEditGrade(grade) {
    setEditingGrade(grade);
    setEditedGradeName(grade);
  }

  async function handleRemoveGrade(gradeToRemove) {
    const hasStudents = students.some(
      (student) => student.serie === gradeToRemove,
    );

    if (hasStudents) {
      showAlert("Não é possível remover uma série que já possui alunos.");
      return;
    }

    askConfirm(`Deseja remover a série "${gradeToRemove}"?`, async () => {
      try {
        const gradesRef = collection(db, "grades");
        const q = query(gradesRef, where("nome", "==", gradeToRemove));
        const snapshot = await getDocs(q);

        for (const documentItem of snapshot.docs) {
          await deleteDoc(doc(db, "grades", documentItem.id));
        }

        if (selectedSeries === gradeToRemove) {
          setSelectedSeries("");
        }
      } catch (error) {
        console.error(error);
        showAlert("Não foi possível remover a série.");
      }
    });
  }

  async function handleUpdateGrade() {
    const newName = editedGradeName.trim();

    if (!editingGrade) return;

    if (!newName) {
      showAlert("Digite o novo nome da série.");
      return;
    }

    if (newName === editingGrade) {
      setEditingGrade(null);
      setEditedGradeName("");
      return;
    }

    if (grades.includes(newName)) {
      showAlert("Já existe uma série com esse nome.");
      return;
    }

    try {
      const gradesRef = collection(db, "grades");
      const q = query(gradesRef, where("nome", "==", editingGrade));
      const snapshot = await getDocs(q);

      for (const documentItem of snapshot.docs) {
        await updateDoc(doc(db, "grades", documentItem.id), {
          nome: newName,
        });
      }

      const studentsToUpdate = students.filter(
        (student) => student.serie === editingGrade,
      );

      for (const student of studentsToUpdate) {
        await updateDoc(doc(db, "students", student.id), {
          serie: newName,
        });
      }

      if (selectedSeries === editingGrade) {
        setSelectedSeries(newName);
      }

      setEditingGrade(null);
      setEditedGradeName("");
      showAlert("Série atualizada com sucesso.");
    } catch (error) {
      console.error(error);
      showAlert("Não foi possível editar a série.");
    }
  }

  function importStudentsCSV(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

        if (lines.length < 2) {
          showAlert("O arquivo CSV está vazio ou inválido.");
          return;
        }

        const dataLines = lines.slice(1);

        const importedStudents = dataLines.map((line) => {
          const values = line
            .split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((value) => value.replace(/^"|"$/g, "").replace(/""/g, '"'));

          return {
            nome: values[0] || "",
            sige: values[1] || "",
            censo: values[2] || "",
            nomePai: values[3] || "",
            nomeMae: values[4] || "",
            nomeResponsavel: values[5] || "",
            telefonePais: values[6] || "",
            cpf: values[7] || "",
            rg: values[8] || "",
            corRaca: values[9] || "",
            nascimento: values[10] || "",
            sus: values[11] || "",
            transporte: (values[12] || "").toLowerCase() === "sim",
            transporteTipo: values[13] || "",
            situacaoVacina:
              (values[14] || "").toLowerCase() === "não" ? "nao" : "sim",
            faltaVacina: values[15] || "",
            historicoEscolar:
              (values[16] || "").toLowerCase() === "sim" ? "sim" : "nao",
            sexo: (values[17] || "").toLowerCase(),
            serie: values[18] || "",
            archived: (values[19] || "").toLowerCase() === "sim",
            anoLetivo: values[20] || String(new Date().getFullYear()),
          };
        });

        const validStudents = importedStudents.filter(
          (student) => student.nome.trim() !== "",
        );

        const nonDuplicateStudents = validStudents.filter(
          (student) => !isDuplicateStudent(student),
        );

        const duplicateCount =
          validStudents.length - nonDuplicateStudents.length;

        if (nonDuplicateStudents.length === 0) {
          showAlert("Todos os alunos do arquivo já existem no sistema.");
          return;
        }

        if (validStudents.length === 0) {
          showAlert("Nenhum aluno válido foi encontrado no arquivo.");
          return;
        }

        askConfirm(
          duplicateCount > 0
            ? `Foram encontrados ${duplicateCount} aluno(s) repetido(s), que serão ignorados. Deseja importar ${nonDuplicateStudents.length} aluno(s)?`
            : `Deseja importar ${nonDuplicateStudents.length} aluno(s)?`,
          async () => {
            try {
              for (const student of nonDuplicateStudents) {
                await addDoc(collection(db, "students"), {
                  ...student,
                });

                await addHistory("importou", student.nome);
              }

              showAlert("Importação concluída com sucesso.");
              event.target.value = "";
            } catch (error) {
              console.error(error);
              showAlert("Erro ao importar alunos.");
            }
          },
        );
      } catch (error) {
        console.error(error);
        showAlert("Não foi possível importar o arquivo CSV.");
      }
    };

    reader.readAsText(file, "UTF-8");
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function onlyNumbers(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function isDuplicateStudent(studentData, ignoreId = null) {
    return students.some((student) => {
      if (ignoreId && student.id === ignoreId) return false;

      const currentSige = normalizeText(student.sige);
      const newSige = normalizeText(studentData.sige);

      if (currentSige && newSige && currentSige === newSige) {
        return true;
      }

      const currentCpf = onlyNumbers(student.cpf);
      const newCpf = onlyNumbers(studentData.cpf);

      if (currentCpf && newCpf && currentCpf === newCpf) {
        return true;
      }

      const currentNome = normalizeText(student.nome);
      const newNome = normalizeText(studentData.nome);

      const currentNascimento = normalizeText(student.nascimento);
      const newNascimento = normalizeText(studentData.nascimento);

      if (
        currentNome &&
        newNome &&
        currentNascimento &&
        newNascimento &&
        currentNome === newNome &&
        currentNascimento === newNascimento
      ) {
        return true;
      }

      return false;
    });
  }

  function exportBackup() {
    const backupData = {
      students,
      grades,
      history,
      exportedAt: new Date().toLocaleString("pt-BR"),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "backup-gestao-escolar.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.students || !data.grades || !data.history) {
          showAlert("Arquivo de backup inválido.");
          return;
        }

        askConfirm(
          "Deseja restaurar este backup? Os dados atuais do sistema serão substituídos.",
          async () => {
            try {
              const studentsRef = collection(db, "students");
              const snapshot = await getDocs(studentsRef);

              for (const docItem of snapshot.docs) {
                await deleteDoc(doc(db, "students", docItem.id));
              }

              for (const student of data.students) {
                const { id, ...studentWithoutId } = student;
                await addDoc(studentsRef, studentWithoutId);
              }

              showAlert("Backup restaurado com sucesso.");
              event.target.value = "";
            } catch (error) {
              console.error(error);
              showAlert("Erro ao restaurar backup.");
            }
          },
        );
      } catch (error) {
        console.error(error);
        showAlert("Não foi possível restaurar o backup.");
      }
    };

    reader.readAsText(file, "UTF-8");
  }

  function handlePrintStudent(student) {
    if (!student) return;

    const idade = calcularIdade(student.nascimento);

    const html = `
      <html>
        <head>
          <title>Ficha do Aluno</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
            }

            h1 {
              margin-bottom: 8px;
              font-size: 24px;
            }

            .subtitle {
              margin-bottom: 24px;
              color: #6b7280;
              font-size: 14px;
            }

            .section {
              margin-bottom: 24px;
            }

            .section h2 {
              font-size: 16px;
              margin-bottom: 12px;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 6px;
            }

            .line {
              margin-bottom: 8px;
              font-size: 14px;
            }

            strong {
              display: inline-block;
              min-width: 170px;
            }
          </style>
        </head>
        <body>
          <h1>Ficha do Aluno</h1>
          <div class="subtitle">Gestão Escolar</div>

          <div class="section">
            <h2>Dados do aluno</h2>
            <div class="line"><strong>Nome:</strong> ${student.nome || "-"}</div>
            <div class="line"><strong>SIGE:</strong> ${student.sige || "-"}</div>
            <div class="line"><strong>ID do censo:</strong> ${student.censo || "-"}</div>
            <div class="line"><strong>Sexo:</strong> ${
              student.sexo === "masculino"
                ? "Masculino"
                : student.sexo === "feminino"
                  ? "Feminino"
                  : "-"
            }</div>
            <div class="line"><strong>Data de nascimento:</strong> ${formatarData(student.nascimento)}</div>
            <div class="line"><strong>Idade:</strong> ${idade}</div>
            <div class="line"><strong>Série:</strong> ${student.serie || "-"}</div>
            <div class="line"><strong>Cor/Raça:</strong> ${student.corRaca || "-"}</div>
            <div class="line"><strong>Número do SUS:</strong> ${student.sus || "-"}</div>
          </div>

          <div class="section">
            <h2>Responsáveis</h2>
            <div class="line"><strong>Nome do pai:</strong> ${student.nomePai || "-"}</div>
            <div class="line"><strong>Nome da mãe:</strong> ${student.nomeMae || "-"}</div>
            <div class="line"><strong>Telefone:</strong> ${student.telefonePais || "-"}</div>
            <div class="line"><strong>Nome do responsável:</strong> ${student.nomeResponsavel || "-"}</div>
          </div>

          <div class="section">
            <h2>Documentos</h2>
            <div class="line"><strong>CPF:</strong> ${student.cpf || "-"}</div>
            <div class="line"><strong>RG:</strong> ${student.rg || "-"}</div>
            <div class="line"><strong>Histórico escolar na pasta:</strong> ${
              student.historicoEscolar === "sim" ? "Sim" : "Não"
            }</div>
          </div>

          <div class="section">
            <h2>Saúde e transporte</h2>
            <div class="line"><strong>Transporte:</strong> ${
              student.transporte ? student.transporteTipo || "Sim" : "Não"
            }</div>
            <div class="line"><strong>Vacinação em dia:</strong> ${
              student.situacaoVacina === "nao" ? "Não" : "Sim"
            }</div>
            <div class="line"><strong>Vacina pendente:</strong> ${
              student.situacaoVacina === "nao"
                ? student.faltaVacina || "-"
                : "Não"
            }</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      showAlert("Não foi possível abrir a janela de impressão.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function showAlert(message) {
    setAlertModal({
      open: true,
      message,
    });
  }

  function closeAlert() {
    setAlertModal({
      open: false,
      message: "",
    });
  }

  function askConfirm(message, onConfirm) {
    setConfirmModal({
      open: true,
      message,
      onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmModal({
      open: false,
      message: "",
      onConfirm: null,
    });
  }

  function handleConfirmYes() {
    if (confirmModal.onConfirm) {
      confirmModal.onConfirm();
    }
    closeConfirm();
  }

  function getNextSerie(serie) {
    if (!serie) return "";

    if (serie.startsWith("6º ano")) return serie.replace("6º ano", "7º ano");
    if (serie.startsWith("7º ano")) return serie.replace("7º ano", "8º ano");
    if (serie.startsWith("8º ano")) return serie.replace("8º ano", "9º ano");

    return "";
  }

  function handleTurnSchoolYear() {
    const currentYear =
      dashboardYearFilter === "Todos"
        ? String(new Date().getFullYear())
        : dashboardYearFilter;

    const nextYear = String(Number(currentYear) + 1);

    const studentsFromCurrentYear = students.filter(
      (student) => !student.archived && student.anoLetivo === currentYear,
    );

    if (studentsFromCurrentYear.length === 0) {
      showAlert(
        `Não há alunos ativos no ano letivo ${currentYear} para promover.`,
      );
      return;
    }

    const alreadyHasNextYearStudents = students.some(
      (student) => student.anoLetivo === nextYear,
    );

    if (alreadyHasNextYearStudents) {
      showAlert(
        `Já existem alunos cadastrados no ano letivo ${nextYear}. Para evitar duplicação, a virada de ano foi bloqueada.`,
      );
      return;
    }

    askConfirm(
      `Deseja virar o ano letivo de ${currentYear} para ${nextYear}? Os alunos do 6º, 7º e 8º serão promovidos. Os alunos do 9º ano serão arquivados no ano atual.`,
      () => {
        const promotedStudents = [];
        const archivedNinthGradeIds = [];

        studentsFromCurrentYear.forEach((student) => {
          const nextSerie = getNextSerie(student.serie);

          if (nextSerie) {
            promotedStudents.push({
              ...student,
              id: Date.now() + Math.random() + promotedStudents.length,
              serie: nextSerie,
              anoLetivo: nextYear,
              archived: false,
            });
          } else if (student.serie?.startsWith("9º ano")) {
            archivedNinthGradeIds.push(student.id);
          }
        });

        setStudents((prev) => {
          const updatedCurrent = prev.map((student) =>
            archivedNinthGradeIds.includes(student.id)
              ? { ...student, archived: true }
              : student,
          );

          return [...promotedStudents, ...updatedCurrent];
        });

        addHistory("virou o ano letivo", `${currentYear} → ${nextYear}`);
        showAlert(`Ano letivo atualizado com sucesso para ${nextYear}.`);
        setDashboardYearFilter(nextYear);
      },
    );
  }

  function handleClearHistory() {
    askConfirm("Deseja limpar todo o histórico?", async () => {
      try {
        const historyRef = collection(db, "history");
        const snapshot = await getDocs(historyRef);

        for (const docItem of snapshot.docs) {
          await deleteDoc(doc(db, "history", docItem.id));
        }

        showAlert("Histórico limpo com sucesso.");
      } catch (error) {
        console.error(error);
        showAlert("Não foi possível limpar o histórico.");
      }
    });
  }

  if (authLoading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return (
      <>
        {toast.open && (
          <div className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
            <button onClick={closeToast}>×</button>
          </div>
        )}

        <div className="login-page">
          <div className="login-card">
            <div className="login-header">
              <img src={logoRedencao} className="login-logo" />
              <h2>EMEF Maria Augusta</h2>
              <p>Painel administrativo</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="input-field">
                <FiMail className="input-icon" />

                <input
                  type="email"
                  placeholder="E-mail"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                />
              </div>

              <div className="password-field">
                <FiLock className="input-icon" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                />

                <span
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>

              {capsLockOn && (
                <div className="caps-warning">Caps Lock está ativado</div>
              )}

              <button
                type="submit"
                className="primary-btn"
                disabled={loginLoading}
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>

              <button
                type="button"
                className="link-btn"
                onClick={handleResetPassword}
              >
                Esqueci minha senha
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`app-shell ${darkMode ? "dark" : ""}`}>
      <aside className="sidebar">
        <div>
          <div className="brand">
            <img
              src={logoRedencao}
              alt="Logo da escola"
              className="sidebar-logo"
            />

            <div className="brand-text">
              <h2>Maria Augusta</h2>
              <p>EMEF • Painel administrativo</p>
            </div>
          </div>

          <nav className="menu">
            <button
              className={activePage === "dashboard" ? "active" : ""}
              onClick={() => {
                setActivePage("dashboard");
                closePanels();
              }}
            >
              Dashboard
            </button>

            <button
              className={activePage === "alunos" ? "active" : ""}
              onClick={() => {
                resetStudentFilters();
                setActivePage("alunos");
              }}
            >
              Alunos
            </button>

            <button
              className={activePage === "series" ? "active" : ""}
              onClick={() => setActivePage("series")}
            >
              Séries
            </button>

            <button
              className={activePage === "historico" ? "active" : ""}
              onClick={() => setActivePage("historico")}
            >
              Histórico
            </button>

            <button
              className={activePage === "configuracoes" ? "active" : ""}
              onClick={() => setActivePage("configuracoes")}
            >
              Configurações
            </button>
          </nav>
        </div>

        <div className="sidebar-footer user-box">
          <div className="user-info">
            <p className="user-email" title={userProfile?.nome || user?.email}>
              {userProfile?.nome || user?.email}
            </p>

            <small className="user-role">
              {userProfile?.cargo || "Usuário"}
            </small>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>
              {activePage === "dashboard" && "Dashboard"}
              {activePage === "alunos" && "Alunos"}
              {activePage === "series" && "Séries"}
              {activePage === "historico" && "Histórico"}
              {activePage === "configuracoes" && "Configurações"}
            </h1>
            <p>Gerencie alunos, séries e dados escolares.</p>
          </div>

          <div className="topbar-actions">
            {activePage === "dashboard" && (
              <>
                <select
                  value={dashboardYearFilter}
                  onChange={(e) => setDashboardYearFilter(e.target.value)}
                >
                  {availableSchoolYears.map((year) => (
                    <option key={year} value={year}>
                      Ano letivo: {year}
                    </option>
                  ))}
                </select>

                <button
                  className="secondary-btn"
                  onClick={handleTurnSchoolYear}
                >
                  Virar ano letivo
                </button>

                <button
                  className="theme-toggle-btn"
                  onClick={() => setDarkMode(!darkMode)}
                  title={darkMode ? "Modo claro" : "Modo escuro"}
                >
                  {darkMode ? <FiSun /> : <FiMoon />}
                </button>
              </>
            )}

            {activePage === "alunos" && (
              <button className="primary-btn" onClick={openNewStudentForm}>
                + Novo Aluno
              </button>
            )}
          </div>
        </header>

        {activePage === "dashboard" && (
          <section className="page-grid">
            <div className="cards-row">
              <div
                className="card stat-card clickable-card"
                onClick={goToAllStudents}
              >
                <span>Total de alunos</span>
                <strong>{stats.total}</strong>
              </div>

              <div
                className="card stat-card clickable-card"
                onClick={goToTransport}
              >
                <span>Usam transporte</span>
                <strong>{stats.transporte}</strong>
              </div>

              <div className="card stat-card clickable-card" onClick={goToBoys}>
                <span>Meninos</span>
                <strong>{stats.meninos}</strong>
              </div>

              <div
                className="card stat-card clickable-card"
                onClick={goToGirls}
              >
                <span>Meninas</span>
                <strong>{stats.meninas}</strong>
              </div>

              <div
                className="card stat-card clickable-card"
                onClick={goToPendingVaccines}
              >
                <span>Vacina pendente</span>
                <strong>{stats.vacinaPendente}</strong>
              </div>

              <div
                className="card stat-card clickable-card"
                onClick={goToArchived}
              >
                <span>Arquivados</span>
                <strong>{archivedStudents.length}</strong>
              </div>
            </div>

            <div className="dashboard-analytics-grid">
              <div className="card">
                <h3>Distribuição por sexo</h3>

                {stats.meninos === 0 && stats.meninas === 0 ? (
                  <p>Nenhum aluno cadastrado para exibir no gráfico.</p>
                ) : stats.meninos === 0 || stats.meninas === 0 ? (
                  <div className="gender-empty-state">
                    <strong>
                      {stats.meninos > 0 ? "100% meninos" : "100% meninas"}
                    </strong>

                    <p>
                      {stats.meninos > 0
                        ? `${stats.meninos} aluno(s) masculino(s) e nenhuma aluna cadastrada.`
                        : `${stats.meninas} aluna(s) cadastrada(s) e nenhum aluno masculino.`}
                    </p>
                  </div>
                ) : (
                  <div className="gender-chart-box">
                    <div className="gender-chart-inner">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={genderChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={58}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            labelLine={false}
                            label={false}
                          >
                            {genderChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  genderChartColors[
                                    index % genderChartColors.length
                                  ]
                                }
                              />
                            ))}
                          </Pie>

                          <Tooltip
                            formatter={(value) => [
                              `${value} aluno(s)`,
                              "Quantidade",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="gender-chart-summary">
                      <span className="gender-summary boys">
                        Meninos:{" "}
                        {stats.total > 0
                          ? Math.round((stats.meninos / stats.total) * 100)
                          : 0}
                        %
                      </span>

                      <span className="gender-summary girls">
                        Meninas:{" "}
                        {stats.total > 0
                          ? Math.round((stats.meninas / stats.total) * 100)
                          : 0}
                        %
                      </span>
                    </div>

                    <div className="gender-legend-custom">
                      <span className="legend-item">
                        <span
                          className="legend-color"
                          style={{ backgroundColor: "#3b82f6" }}
                        />
                        Meninos
                      </span>

                      <span className="legend-item">
                        <span
                          className="legend-color"
                          style={{ backgroundColor: "#ec4899" }}
                        />
                        Meninas
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <h3>Indicador de vacinação pendente</h3>

                <div className="progress-card-info">
                  <strong>{vaccinePendingLabel}</strong>
                  <span>{vaccinePendingPercent.toFixed(1)}% do total</span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill progress-fill-danger"
                    style={{ width: `${vaccinePendingPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Alunos por série</h3>

              <div className="grouped-series">
                {Object.entries(dashboardGroupedSeries).map(([ano, turmas]) => {
                  const totalAno = turmas.reduce(
                    (sum, item) => sum + item.total,
                    0,
                  );

                  return (
                    <div key={ano} className="series-group">
                      <h4
                        className="series-group-title"
                        onClick={() =>
                          setOpenSeries(openSeries === ano ? null : ano)
                        }
                      >
                        <span>{ano}</span>

                        <span className="series-group-meta">
                          <span className="series-group-dash">•</span>
                          <span className="series-group-total">
                            {totalAno} aluno(s)
                          </span>
                        </span>

                        <span className="series-arrow">
                          {openSeries === ano ? "▲" : "▼"}
                        </span>
                      </h4>

                      {openSeries === ano && (
                        <div className="series-list">
                          {turmas.length > 0 ? (
                            turmas.map((item) => (
                              <div
                                key={item.serie}
                                className="series-item clickable"
                                onClick={() => goToSeries(item.serie)}
                              >
                                <span>{item.serie}</span>
                                <strong>{item.total}</strong>
                              </div>
                            ))
                          ) : (
                            <div className="series-empty">
                              Nenhum aluno cadastrado
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {activePage === "alunos" && (
          <section className="page-grid">
            <div className="card filters-card">
              <div className="filters-row">
                <input
                  type="text"
                  placeholder="Buscar por nome, SIGE, CPF ou RG"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />

                <select
                  value={serieFiltro}
                  onChange={(e) => {
                    setSerieFiltro(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="Todas">Todas</option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>

                <button
                  className={
                    !showArchived
                      ? "secondary-btn active-filter"
                      : "secondary-btn"
                  }
                  onClick={() => {
                    setShowArchived(false);
                    setCurrentPage(1);
                  }}
                >
                  Ativos
                </button>

                <div className="filters-actions">
                  <button className="secondary-btn" onClick={exportStudentsCSV}>
                    Exportar todos (.xlsx)
                  </button>

                  {serieFiltro !== "Todas" && (
                    <button
                      className="secondary-btn"
                      onClick={exportFilteredStudentsCSV}
                    >
                      Exportar série (.xlsx)
                    </button>
                  )}
                </div>
              </div>

              {activeFilterLabel && (
                <div className="active-extra-filter">
                  <span>Exibindo apenas {activeFilterLabel}.</span>
                  <button
                    className="secondary-btn"
                    onClick={resetStudentFilters}
                  >
                    Limpar filtro
                  </button>
                </div>
              )}

              <div className="results-info">{resultsLabel}</div>

              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>SIGE</th>
                        <th>Série</th>
                        <th>Transporte</th>
                        <th>Sexo</th>
                        <th>Vacina pendente</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedStudents.length > 0 ? (
                        paginatedStudents.map((student) => (
                          <tr key={student.id}>
                            <td>{student.nome}</td>
                            <td>{student.sige || "-"}</td>
                            <td>{student.serie || "-"}</td>
                            <td>{student.transporte ? "Sim" : "Não"}</td>
                            <td>
                              {student.sexo === "masculino"
                                ? "Masculino"
                                : student.sexo === "feminino"
                                  ? "Feminino"
                                  : "-"}
                            </td>
                            <td>
                              {student.situacaoVacina === "nao" ? (
                                <span
                                  style={{ color: "#dc2626", fontWeight: 600 }}
                                >
                                  🔴 Pendente
                                </span>
                              ) : (
                                <span
                                  style={{ color: "#16a34a", fontWeight: 600 }}
                                >
                                  🟢 Em dia
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="actions">
                                <button
                                  className="table-btn view"
                                  onClick={() => openViewStudent(student)}
                                >
                                  Ver
                                </button>

                                <button
                                  className="table-btn"
                                  onClick={() => openEditStudentForm(student)}
                                >
                                  Editar
                                </button>

                                {!student.archived ? (
                                  <button
                                    className="table-btn warning"
                                    onClick={() =>
                                      handleArchiveStudent(student.id)
                                    }
                                  >
                                    Arquivar
                                  </button>
                                ) : (
                                  <button
                                    className="table-btn restore"
                                    onClick={() =>
                                      handleRestoreStudent(student.id)
                                    }
                                  >
                                    Restaurar
                                  </button>
                                )}

                                <button
                                  className="table-btn danger"
                                  onClick={() =>
                                    handleDeleteStudent(student.id)
                                  }
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="empty-state">
                            Nenhum aluno encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {displayedStudents.length > 0 && (
              <div className="pagination">
                <span className="pagination-info">
                  Página {safeCurrentPage} de {totalPages}
                </span>

                <div className="pagination-actions">
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={safeCurrentPage === 1}
                  >
                    Anterior
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={safeCurrentPage === totalPages}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

            {selectedStudent && (
              <div className="modal-overlay" onClick={closePanels}>
                <div
                  className="modal-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="panel-header">
                    <h3>Detalhes do aluno</h3>

                    <div className="panel-header-actions">
                      <button
                        className="secondary-btn"
                        onClick={() => handlePrintStudent(selectedStudent)}
                      >
                        Imprimir ficha
                      </button>

                      <button className="close-btn" onClick={closePanels}>
                        X
                      </button>
                    </div>
                  </div>

                  <div className="details-grid">
                    <div>
                      <strong>Nome:</strong> {selectedStudent.nome || "-"}
                    </div>

                    <div>
                      <strong>SIGE:</strong> {selectedStudent.sige || "-"}
                    </div>

                    <div>
                      <strong>ID do censo:</strong>{" "}
                      {selectedStudent.censo || "-"}
                    </div>

                    <div>
                      <strong>Nome do pai:</strong>{" "}
                      {selectedStudent.nomePai || "-"}
                    </div>

                    <div>
                      <strong>Nome da mãe:</strong>{" "}
                      {selectedStudent.nomeMae || "-"}
                    </div>

                    <div>
                      <strong>Nome do responsável:</strong>{" "}
                      {selectedStudent.nomeResponsavel || "-"}
                    </div>

                    <div>
                      <strong>Telefone dos pais:</strong>{" "}
                      {selectedStudent.telefonePais || "-"}
                    </div>

                    <div>
                      <strong>CPF:</strong> {selectedStudent.cpf || "-"}
                    </div>

                    <div>
                      <strong>RG:</strong> {selectedStudent.rg || "-"}
                    </div>

                    <div>
                      <strong>Cor/Raça:</strong>{" "}
                      {selectedStudent.corRaca || "-"}
                    </div>

                    <div>
                      <strong>Sexo:</strong>{" "}
                      {selectedStudent.sexo === "masculino"
                        ? "Masculino"
                        : selectedStudent.sexo === "feminino"
                          ? "Feminino"
                          : "-"}
                    </div>

                    <div>
                      <strong>Data de nascimento:</strong>{" "}
                      {formatarData(selectedStudent.nascimento)}
                    </div>

                    <div>
                      <strong>Idade:</strong>{" "}
                      {calcularIdade(selectedStudent.nascimento)}
                    </div>

                    <div>
                      <strong>Transporte:</strong>{" "}
                      {selectedStudent.transporte
                        ? selectedStudent.transporteTipo || "Sim"
                        : "Não"}
                    </div>

                    <div>
                      <strong>Número do SUS:</strong>{" "}
                      {selectedStudent.sus || "-"}
                    </div>

                    <div>
                      <strong>Vacinação em dia:</strong>{" "}
                      {selectedStudent.situacaoVacina === "nao" ? "Não" : "Sim"}
                    </div>

                    <div>
                      <strong>Falta vacina:</strong>{" "}
                      {selectedStudent.situacaoVacina === "nao"
                        ? selectedStudent.faltaVacina || "-"
                        : "Não"}
                    </div>

                    <div>
                      <strong>Série:</strong> {selectedStudent.serie || "-"}
                    </div>

                    <div>
                      <strong>Histórico escolar na pasta:</strong>{" "}
                      {selectedStudent.historicoEscolar === "sim"
                        ? "Sim"
                        : "Não"}
                    </div>

                    <div>
                      <strong>Ano letivo:</strong>{" "}
                      {selectedStudent.anoLetivo || "-"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showForm && (
              <div className="modal-overlay" onClick={closePanels}>
                <div
                  className="modal-card modal-card-large"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="panel-header">
                    <h3>{editingId ? "Editar aluno" : "Novo aluno"}</h3>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={closePanels}
                    >
                      X
                    </button>
                  </div>

                  <form className="student-form" onSubmit={handleSaveStudent}>
                    <div className="form-grid">
                      <div>
                        <label>Nome do aluno</label>
                        <input
                          name="nome"
                          value={formData.nome}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label>Número do SIGE</label>
                        <input
                          name="sige"
                          value={formData.sige}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label>ID do censo</label>
                        <input
                          name="censo"
                          value={formData.censo}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label>Nome do pai</label>
                        <input
                          name="nomePai"
                          value={formData.nomePai || ""}
                          onChange={handleInputChange}
                          placeholder="Digite o nome do pai"
                        />
                      </div>

                      <div>
                        <label>Nome da mãe</label>
                        <input
                          name="nomeMae"
                          value={formData.nomeMae || ""}
                          onChange={handleInputChange}
                          placeholder="Digite o nome da mãe"
                        />
                      </div>

                      <div>
                        <label>Nome do responsável</label>
                        <input
                          name="nomeResponsavel"
                          value={formData.nomeResponsavel || ""}
                          onChange={handleInputChange}
                          placeholder="Digite o nome do responsável"
                        />
                      </div>

                      <div>
                        <label>Telefone dos pais</label>
                        <input
                          name="telefonePais"
                          value={formData.telefonePais}
                          onChange={handleInputChange}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          inputMode="numeric"
                        />
                      </div>

                      <div>
                        <label>CPF</label>
                        <input
                          name="cpf"
                          value={formData.cpf}
                          onChange={handleInputChange}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          inputMode="numeric"
                        />
                      </div>

                      <div>
                        <label>RG</label>
                        <input
                          name="rg"
                          value={formData.rg}
                          onChange={handleInputChange}
                          placeholder="Digite o RG"
                          maxLength={20}
                        />
                      </div>

                      <div>
                        <label>Sexo</label>
                        <select
                          name="sexo"
                          value={formData.sexo}
                          onChange={handleInputChange}
                        >
                          <option value="">Selecione</option>
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                        </select>
                      </div>

                      <div>
                        <label>Cor/Raça</label>
                        <select
                          name="corRaca"
                          value={formData.corRaca || ""}
                          onChange={handleInputChange}
                        >
                          <option value="">Selecione</option>
                          <option value="Branca">Branca</option>
                          <option value="Preta">Preta</option>
                          <option value="Parda">Parda</option>
                          <option value="Amarela">Amarela</option>
                          <option value="Indígena">Indígena</option>
                        </select>
                      </div>

                      <div>
                        <label>Data de nascimento</label>
                        <input
                          type="date"
                          name="nascimento"
                          value={formData.nascimento}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label>Número do SUS</label>
                        <input
                          name="sus"
                          value={formData.sus}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div>
                        <label>Série</label>
                        <select
                          name="serie"
                          value={formData.serie}
                          onChange={handleInputChange}
                        >
                          <option value="">Selecione</option>
                          {grades.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Possui histórico escolar na pasta?</label>
                        <select
                          name="historicoEscolar"
                          value={formData.historicoEscolar}
                          onChange={handleInputChange}
                        >
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>

                      <div>
                        <label>Ano letivo</label>
                        <select
                          name="anoLetivo"
                          value={formData.anoLetivo}
                          onChange={handleInputChange}
                        >
                          <option value="">Selecione</option>
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                        </select>
                      </div>

                      <div className="checkbox-row full-width">
                        <div>
                          <label>Usa transporte?</label>
                          <select
                            name="transporte"
                            value={formData.transporte ? "sim" : "nao"}
                            onChange={handleInputChange}
                          >
                            <option value="nao">Não</option>
                            <option value="sim">Sim</option>
                          </select>
                        </div>

                        {formData.transporte && (
                          <div className="full-width">
                            <label>Qual transporte?</label>
                            <input
                              name="transporteTipo"
                              value={formData.transporteTipo || ""}
                              onChange={handleInputChange}
                              placeholder="Ex.: Ônibus escolar"
                            />
                          </div>
                        )}

                        <div>
                          <label>Vacinação em dia?</label>
                          <select
                            name="situacaoVacina"
                            value={formData.situacaoVacina}
                            onChange={handleInputChange}
                          >
                            <option value="sim">Sim</option>
                            <option value="nao">Não</option>
                          </select>
                        </div>
                      </div>

                      {formData.situacaoVacina === "nao" && (
                        <div className="full-width">
                          <label>Falta alguma vacina?</label>
                          <input
                            name="faltaVacina"
                            value={formData.faltaVacina}
                            onChange={handleInputChange}
                            placeholder="Ex.: Hepatite, reforço..."
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="primary-btn">
                        Salvar aluno
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {activePage === "series" && (
          <section className="page-grid">
            <div className="card">
              <div className="panel-header">
                <h3>Gerenciar séries</h3>
                <button
                  className="secondary-btn"
                  onClick={() => setSeriesEditMode((prev) => !prev)}
                >
                  {seriesEditMode ? "Fechar edição" : "Editar séries"}
                </button>
              </div>

              {["6", "7", "8", "9"].map((year) => {
                const seriesOfYear = grades.filter((grade) =>
                  grade.trim().startsWith(`${year}º`),
                );

                if (seriesOfYear.length === 0) return null;

                return (
                  <div key={year} className="series-year-block">
                    <h3 className="series-year-title">{year}º Ano</h3>

                    <div className="series-overview-grid">
                      {seriesOfYear.map((grade) => {
                        const totalStudentsInGrade = activeStudents.filter(
                          (student) => student.serie === grade,
                        ).length;

                        const isActive = selectedSeries === grade;

                        return (
                          <button
                            key={grade}
                            type="button"
                            className={
                              isActive ? "series-card active" : "series-card"
                            }
                            onClick={() => setSelectedSeries(grade)}
                          >
                            <span className="series-card-title">{grade}</span>

                            <div className="series-card-count">
                              {totalStudentsInGrade}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {selectedSeries && (
                <div className="selected-series-panel">
                  <div className="selected-series-header">
                    <div>
                      <h4>{selectedSeries}</h4>
                      <p>
                        {studentsFromSelectedSeries.length === 1
                          ? "1 aluno cadastrado nesta série"
                          : `${studentsFromSelectedSeries.length} alunos cadastrados nesta série`}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setSelectedSeries("")}
                    >
                      Fechar
                    </button>
                  </div>

                  {studentsFromSelectedSeries.length > 0 ? (
                    <div className="simple-student-list modern-student-list">
                      {[...studentsFromSelectedSeries]
                        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                        .map((student) => (
                          <div key={student.id} className="modern-student-item">
                            <div>
                              <strong>{student.nome}</strong>
                              <small>{student.sige || "Sem SIGE"}</small>
                            </div>

                            <button
                              type="button"
                              className="table-btn view"
                              onClick={() => {
                                resetStudentFilters();
                                setActivePage("alunos");
                                openViewStudent(student);
                              }}
                            >
                              Ver
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="series-empty-box">
                      Nenhum aluno cadastrado nesta série.
                    </div>
                  )}
                </div>
              )}

              {seriesEditMode && (
                <>
                  <div className="grade-add-box">
                    <h4>Nova série</h4>
                    <div className="grade-add-row">
                      <input
                        type="text"
                        placeholder="Ex.: 6º ano D"
                        value={newGrade}
                        onChange={(e) => setNewGrade(e.target.value)}
                      />
                      <button className="primary-btn" onClick={handleAddGrade}>
                        Adicionar
                      </button>
                    </div>
                  </div>

                  <div className="grade-list">
                    {grades.map((grade) => {
                      const totalStudentsInGrade = activeStudents.filter(
                        (student) => student.serie === grade,
                      ).length;

                      const isEditing = editingGrade === grade;

                      return (
                        <div key={grade} className="grade-manage-card">
                          <div className="grade-manage-info">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editedGradeName}
                                onChange={(e) =>
                                  setEditedGradeName(e.target.value)
                                }
                                className="grade-edit-input"
                              />
                            ) : (
                              <>
                                <strong>{grade}</strong>
                                <span>{totalStudentsInGrade} aluno(s)</span>
                              </>
                            )}
                          </div>

                          <div className="grade-manage-actions">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  className="save-btn"
                                  onClick={handleUpdateGrade}
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  className="cancel-btn"
                                  onClick={() => {
                                    setEditingGrade(null);
                                    setEditedGradeName("");
                                  }}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="edit-btn"
                                  onClick={() => handleStartEditGrade(grade)}
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  className="remove-btn"
                                  onClick={() => handleRemoveGrade(grade)}
                                >
                                  Remover
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {activePage === "historico" && (
          <section className="page-grid">
            <div className="card">
              <div className="panel-header">
                <h3>Histórico</h3>
                <button className="secondary-btn" onClick={handleClearHistory}>
                  Limpar histórico
                </button>
              </div>

              {history.length > 0 ? (
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.id} className="history-item">
                      <strong>{item.user}</strong>
                      <span>
                        {item.action} o aluno {item.studentName} em{" "}
                        {item.dataHora}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nenhuma ação registrada ainda.</p>
              )}
            </div>
          </section>
        )}

        {activePage === "configuracoes" && (
          <section className="page-grid">
            <div className="card">
              <h3>Configurações</h3>
              <p>
                Gerencie importação, backup e restauração dos dados do sistema.
              </p>

              <div className="config-actions">
                <button className="primary-btn" onClick={exportBackup}>
                  Exportar backup
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => {
                    setShowArchived(true);
                    setActivePage("alunos");
                    setCurrentPage(1);
                  }}
                >
                  Ver alunos arquivados
                </button>

                <label className="file-import-label">
                  Restaurar backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={importBackup}
                    hidden
                  />
                </label>

                <label className="file-import-label">
                  Importar CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={importStudentsCSV}
                    hidden
                  />
                </label>
              </div>
            </div>

            <div className="card security-card">
              <h3>Segurança</h3>

              <div className="security-section">
                <h4>Alterar e-mail</h4>
                <p>Seu e-mail atual é:</p>
                <div className="security-current-email">{user?.email}</div>

                <form onSubmit={handleChangeEmail} className="security-form">
                  <input
                    type="email"
                    placeholder="Novo e-mail"
                    value={securityForm.newEmail}
                    onChange={(e) =>
                      setSecurityForm({
                        ...securityForm,
                        newEmail: e.target.value,
                      })
                    }
                  />

                  <input
                    type="password"
                    placeholder="Senha atual"
                    value={securityForm.currentPassword}
                    onChange={(e) =>
                      setSecurityForm({
                        ...securityForm,
                        currentPassword: e.target.value,
                      })
                    }
                  />

                  <button type="submit" className="primary-btn">
                    Atualizar e-mail
                  </button>
                </form>
              </div>

              <div className="security-section">
                <h4>Alterar senha</h4>
                <p>Use sua senha atual para confirmar a alteração.</p>

                <form onSubmit={handleChangePassword} className="security-form">
                  <input
                    type="password"
                    placeholder="Nova senha"
                    value={securityForm.newPassword}
                    onChange={(e) =>
                      setSecurityForm({
                        ...securityForm,
                        newPassword: e.target.value,
                      })
                    }
                  />

                  <input
                    type="password"
                    placeholder="Senha atual"
                    value={securityForm.currentPassword}
                    onChange={(e) =>
                      setSecurityForm({
                        ...securityForm,
                        currentPassword: e.target.value,
                      })
                    }
                  />

                  <button type="submit" className="primary-btn">
                    Atualizar senha
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {alertModal.open && (
          <div className="modal-overlay" onClick={closeAlert}>
            <div
              className="modal-card modal-card-small"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="panel-header">
                <h3>Aviso</h3>
                <button className="close-btn" onClick={closeAlert}>
                  X
                </button>
              </div>

              <p>{alertModal.message}</p>

              <div className="form-actions">
                <button className="primary-btn" onClick={closeAlert}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmModal.open && (
          <div className="modal-overlay" onClick={closeConfirm}>
            <div
              className="modal-card modal-card-small"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="panel-header">
                <h3>Confirmação</h3>
                <button className="close-btn" onClick={closeConfirm}>
                  X
                </button>
              </div>

              <p>{confirmModal.message}</p>

              <div className="form-actions">
                <button className="secondary-btn" onClick={closeConfirm}>
                  Cancelar
                </button>
                <button className="primary-btn" onClick={handleConfirmYes}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {toast.open && (
          <div className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
            <button onClick={closeToast}>×</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
