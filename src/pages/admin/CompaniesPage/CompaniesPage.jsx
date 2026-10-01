import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import { useAuth } from '../../../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Ruler,
  X,
  FileText,
  Truck,
  Layers,
  Users,
  Handshake,
  ClipboardList,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  DollarSign,
  UserCheck,
  UserPlus,
  Briefcase,
  CheckCircle2,
  User,
  ChevronUp,
  Network,
} from 'lucide-react';
import {
  fetchClientCompanies,
  createClientCompany,
  updateClientCompany,
  deleteClientCompany,
  fetchClients,
  getOpportunities,
  getActivities,
} from '../../../data/api';
import { authApi } from '../../../api/auth.api';
import { Button } from '../../../components/ui/Button/Button';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import { FlipCheckbox } from '../../../components/ui/FlipCheckbox/FlipCheckbox';
import { CompanyTreeModal } from '../../../components/companies/CompanyTreeModal';
import './CompaniesPage.css';

const TIPO_EMPRESA_OPTIONS = ['Productor', 'Distribuidor', 'Cooperativa', 'Acopiador'];

const COLUMNS = [
  { key: 'nombreEmpresa',     label: 'Empresa',               sortable: true },
  { key: 'cuit',              label: 'CUIT',                  sortable: true },
  { key: 'tipoEmpresa',       label: 'Tipo',                  sortable: true },
  { key: 'localidad',         label: 'Localidad',             sortable: true },
  { key: 'contactoAsociado',  label: 'Contacto Asociado',     sortable: false },
  { key: 'proveedorActual',   label: 'Proveedor Actual',      sortable: true },
  { key: 'creadoPorNombre',   label: 'Propietario del Registro', sortable: false },
  { key: 'fechaRegistro',     label: 'Registro',              sortable: true },
  { key: 'superficieHa',      label: 'Superficie (Ha)',       sortable: true },
];

const PAGE_SIZE = 20;

export const CompaniesPage = () => {
  const { currentUser } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  useEffect(() => {
    if (location.state?.prefillSearch) setSearchQuery(location.state.prefillSearch);
  }, [location.state]);
  const [sortBy, setSortBy] = useState('nombreEmpresa');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState(null);
  const [inspectingCompanyId, setInspectingCompanyId] = useState(null);
  const companyModalOverlayHandlers = useOverlayClose(() => { setShowModal(false); setEditingCompany(null); });
  const companyDetailOverlayHandlers = useOverlayClose(() => setSelectedCompanyForDetail(null));
  const [detailActiveTab, setDetailActiveTab] = useState('contactos'); // 'contactos' | 'negocios' | 'actividades'

  // Contact association state for "Registrar Empresa" modal
  const [includeContact, setIncludeContact] = useState(true); // Checkbox con tick
  const [contactMode, setContactMode] = useState('existing'); // 'existing' | 'new'
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [selectedExistingContact, setSelectedExistingContact] = useState(null);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const contactSearchRef = useRef(null);
  const [newContact, setNewContact] = useState({
    nombreApellido: '',
    tipoClient: 'Encargado de Planta',
    telefono: '',
    direccionMail: '',
    numDoc: '',
    nota: '',
  });

  // ── Empresa con regiones (Empresa Madre -> Regiones -> Subsedes) ──
  const [esConRegiones, setEsConRegiones] = useState(false);
  const [encargadoGeneral, setEncargadoGeneral] = useState('');
  const emptyRegion = () => ({ nombre: '', encargado: '', sedePrincipal: '', subsedes: [] });
  const emptySubsede = () => ({ nombre: '', encargado: '', direccion: '' });
  const [regiones, setRegiones] = useState([]);
  const [creandoJerarquia, setCreandoJerarquia] = useState(false);

  const addRegion = () => setRegiones((prev) => [...prev, emptyRegion()]);
  const removeRegion = (idx) => setRegiones((prev) => prev.filter((_, i) => i !== idx));
  const updateRegion = (idx, field, value) => setRegiones((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  const addSubsede = (regionIdx) => setRegiones((prev) => prev.map((r, i) => (i === regionIdx ? { ...r, subsedes: [...r.subsedes, emptySubsede()] } : r)));
  const removeSubsede = (regionIdx, subIdx) => setRegiones((prev) => prev.map((r, i) => (i === regionIdx ? { ...r, subsedes: r.subsedes.filter((_, si) => si !== subIdx) } : r)));
  const updateSubsede = (regionIdx, subIdx, field, value) => setRegiones((prev) => prev.map((r, i) => (i === regionIdx ? {
    ...r,
    subsedes: r.subsedes.map((s, si) => (si === subIdx ? { ...s, [field]: value } : s)),
  } : r)));

  // Cerrar el dropdown de contactos al hacer clic fuera del buscador o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contactSearchRef.current && !contactSearchRef.current.contains(event.target)) {
        setContactDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Carga real desde la base de datos (sin datos mock de relleno)
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setLoadError('');
      const [compRes, cliRes, oppRes, actRes, usrRes] = await Promise.allSettled([
        fetchClientCompanies(),
        fetchClients(),
        getOpportunities(),
        getActivities(),
        authApi.getAllUsers(),
      ]);
      setCompanies(compRes.status === 'fulfilled' && Array.isArray(compRes.value) ? compRes.value : []);
      setClients(cliRes.status === 'fulfilled' && Array.isArray(cliRes.value) ? cliRes.value : []);
      setOpportunities(oppRes.status === 'fulfilled' && Array.isArray(oppRes.value) ? oppRes.value : []);
      setActivities(actRes.status === 'fulfilled' && Array.isArray(actRes.value) ? actRes.value : []);
      const usersList = usrRes.status === 'fulfilled' ? (Array.isArray(usrRes.value) ? usrRes.value : usrRes.value?.data || []) : [];
      setUsers(usersList);
      if (compRes.status === 'rejected') {
        console.error('Error al obtener empresas desde la base de datos:', compRes.reason);
        const errMsg = compRes.reason?.message || '';
        const isAuthError = /token|autenticaci[oó]n|401|403/i.test(errMsg);
        setLoadError(
          isAuthError
            ? 'Tu sesión expiró. Cerrá sesión y volvé a iniciar para ver los datos reales.'
            : 'No se pudo conectar con la base de datos. Verificá tu conexión e intentá de nuevo.'
        );
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Form state matching backend payload: { nombreEmpresa, cuit, direccionEmpresa, tipoEmpresa, superficieHa, localityCodPostal }
  const emptyCompanyForm = {
    nombreEmpresa: '',
    cuit: '',
    tipoEmpresa: 'Productor',
    direccionEmpresa: '',
    localidad: 'Casilda',
    localityCodPostal: '2170',
    superficieHa: '',
    proveedorActual: '',
    descEmpresa: '',
    creadoPorId: currentUser?.idUser || '',
  };
  const [form, setForm] = useState(emptyCompanyForm);

  const openCreateModal = () => {
    setEditingCompany(null);
    setForm(emptyCompanyForm);
    setIncludeContact(true);
    setContactMode('existing');
    setSelectedExistingContact(null);
    setEsConRegiones(false);
    setEncargadoGeneral('');
    setRegiones([]);
    setShowModal(true);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setForm({
      nombreEmpresa: company.nombreEmpresa || '',
      cuit: company.cuit || '',
      tipoEmpresa: company.tipoEmpresa || 'Productor',
      direccionEmpresa: company.direccionEmpresa || '',
      localidad: company.Locality?.nomLocalidad || company.localidad || '',
      localityCodPostal: company.localityCodPostal || '2170',
      superficieHa: company.superficieHa || '',
      proveedorActual: company.proveedorActual || '',
      descEmpresa: company.descEmpresa || '',
      creadoPorId: company.creadoPorId || '',
    });
    setIncludeContact(false);
    setEsConRegiones(false);
    setShowModal(true);
  };

  // Filter contacts for smart search in company registration modal
  const filteredContactsForSearch = useMemo(() => {
    if (!contactSearchQuery || !contactSearchQuery.trim()) {
      return clients.slice(0, 8);
    }
    const q = contactSearchQuery.toLowerCase().trim();
    return clients.filter(c =>
      (c.nombreApellido && c.nombreApellido.toLowerCase().includes(q)) ||
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.apellido && c.apellido.toLowerCase().includes(q)) ||
      (c.direccionMail && c.direccionMail.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.numDoc && c.numDoc.includes(q)) ||
      (c.localidad && c.localidad.toLowerCase().includes(q)) ||
      (c.tipoClient && c.tipoClient.toLowerCase().includes(q))
    );
  }, [clients, contactSearchQuery]);

  const filteredCompanies = useMemo(() => {
    // El listado principal solo muestra el nivel superior (independientes y
    // empresas madre) — las regiones y subsedes se ven desde "Inspeccionar".
    let result = companies.filter((c) => !c.parentCompanyId);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.nombreEmpresa.toLowerCase().includes(q) ||
        c.cuit.includes(q) ||
        (c.Locality?.nomLocalidad || c.localidad || '').toLowerCase().includes(q) ||
        c.tipoEmpresa?.toLowerCase().includes(q)
      );
    }

    if (typeFilter) {
      result = result.filter((c) => c.tipoEmpresa === typeFilter);
    }

    result.sort((a, b) => {
      const valA = (a[sortBy] ?? '').toString().toLowerCase();
      const valB = (b[sortBy] ?? '').toString().toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, searchQuery, typeFilter, sortBy, sortDir]);

  // Primer contacto vinculado a cada empresa, para la columna "Contacto Asociado"
  const companyContactMap = useMemo(() => {
    const map = new Map();
    clients.forEach((cl) => {
      if (cl.clientCompanyId && !map.has(cl.clientCompanyId)) {
        map.set(cl.clientCompanyId, cl);
      }
    });
    return map;
  }, [clients]);

  const totalPages = Math.ceil(filteredCompanies.length / PAGE_SIZE);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedCompanies.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedCompanies.map(c => c.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatSurface = (val) => {
    if (!val) return '-';
    return `${Number(val).toLocaleString('es-AR')} ha`;
  };

  const formatCurrency = (val) => {
    if (!val) return '$0';
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  const resetCompanyModalState = () => {
    setShowModal(false);
    setEditingCompany(null);
    setForm(emptyCompanyForm);
    setIncludeContact(true);
    setContactMode('existing');
    setSelectedExistingContact(null);
    setContactSearchQuery('');
    setContactDropdownOpen(false);
    setNewContact({
      nombreApellido: '',
      tipoClient: 'Encargado de Planta',
      telefono: '',
      direccionMail: '',
      numDoc: '',
      nota: '',
    });
    setEsConRegiones(false);
    setEncargadoGeneral('');
    setRegiones([]);
  };

  // Crea la empresa madre + cada región + cada subsede en secuencia (cada
  // nodo del árbol es una empresa más, enlazada por `parentCompanyId`), con
  // el encargado de cada nivel como un Contacto vinculado vía `newContact`.
  const handleCreateJerarquia = async () => {
    if (!form.nombreEmpresa.trim()) {
      alert('Ingresá el nombre de la empresa madre.');
      return false;
    }
    setCreandoJerarquia(true);
    try {
      const madreRes = await createClientCompany({
        nombreEmpresa: form.nombreEmpresa,
        cuit: form.cuit || ('30-' + Math.floor(10000000 + Math.random() * 90000000) + '-9'),
        tipoEmpresa: form.tipoEmpresa,
        direccionEmpresa: form.direccionEmpresa || 'Casa Central',
        localidad: form.localidad,
        localityCodPostal: form.localityCodPostal || '2170',
        descEmpresa: form.descEmpresa,
        creadoPorId: form.creadoPorId || currentUser?.idUser || null,
        parentCompanyId: null,
        nivelEmpresa: 'madre',
        newContact: encargadoGeneral.trim() ? {
          nombreApellido: encargadoGeneral.trim(),
          tipoClient: 'Encargado Regional',
          nota: `Encargado general de ${form.nombreEmpresa}`,
        } : null,
      });
      const madre = madreRes?.data || madreRes;
      const madreCreador = users.find((u) => u.idUser === form.creadoPorId);

      for (const region of regiones) {
        if (!region.nombre.trim()) continue;
        const regionRes = await createClientCompany({
          nombreEmpresa: region.nombre.trim(),
          cuit: madre.cuit,
          tipoEmpresa: form.tipoEmpresa,
          direccionEmpresa: region.sedePrincipal || 'Sede Regional',
          localidad: form.localidad,
          localityCodPostal: form.localityCodPostal || '2170',
          creadoPorId: form.creadoPorId || currentUser?.idUser || null,
          parentCompanyId: madre.id,
          nivelEmpresa: 'region',
          newContact: region.encargado.trim() ? {
            nombreApellido: region.encargado.trim(),
            tipoClient: 'Encargado Regional',
            nota: `Encargado de la región ${region.nombre}`,
          } : null,
        });
        const regionCompany = regionRes?.data || regionRes;

        for (const sub of region.subsedes) {
          if (!sub.nombre.trim()) continue;
          await createClientCompany({
            nombreEmpresa: sub.nombre.trim(),
            cuit: madre.cuit,
            tipoEmpresa: form.tipoEmpresa,
            direccionEmpresa: sub.direccion || region.sedePrincipal || 'Subsede',
            localidad: form.localidad,
            localityCodPostal: form.localityCodPostal || '2170',
            creadoPorId: form.creadoPorId || currentUser?.idUser || null,
            parentCompanyId: regionCompany.id,
            nivelEmpresa: 'subsede',
            newContact: sub.encargado.trim() ? {
              nombreApellido: sub.encargado.trim(),
              tipoClient: 'Encargado de Planta',
              nota: `Encargado de la subsede ${sub.nombre}`,
            } : null,
          });
        }
      }

      setCompanies((prev) => [{ ...madre, creadoPorNombre: madreCreador?.nombreApellido || null }, ...prev]);
      return true;
    } catch (err) {
      console.error('Error al crear la jerarquía de empresa:', err);
      alert('Se produjo un error creando la estructura. Revisá los datos y probá de nuevo (puede que algunos niveles ya se hayan guardado).');
      return false;
    } finally {
      setCreandoJerarquia(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (esConRegiones && !editingCompany) {
      const ok = await handleCreateJerarquia();
      if (ok) resetCompanyModalState();
      return;
    }

    if (includeContact && contactMode === 'new' && !newContact.nombreApellido.trim()) {
      alert('Por favor ingrese el nombre y apellido del nuevo contacto.');
      return;
    }

    // ── Modo edición: actualiza la empresa existente ──
    if (editingCompany) {
      const updatePayload = {
        nombreEmpresa: form.nombreEmpresa,
        cuit: form.cuit,
        tipoEmpresa: form.tipoEmpresa,
        direccionEmpresa: form.direccionEmpresa,
        localidad: form.localidad,
        localityCodPostal: form.localityCodPostal || '2170',
        superficieHa: form.superficieHa === '' ? null : Number(form.superficieHa),
        proveedorActual: form.proveedorActual,
        descEmpresa: form.descEmpresa,
        creadoPorId: form.creadoPorId || null,
      };
      try {
        const response = await updateClientCompany(editingCompany.id, updatePayload);
        const updatedCompany = response?.data || response;
        const creador = users.find((u) => u.idUser === form.creadoPorId);
        setCompanies((prev) => prev.map((c) => (c.id === editingCompany.id ? {
          ...c,
          ...updatePayload,
          ...updatedCompany,
          creadoPorNombre: creador?.nombreApellido || c.creadoPorNombre || null,
        } : c)));
      } catch (err) {
        console.error('Error al editar empresa:', err);
        alert('No se pudo guardar los cambios de la empresa.');
        return;
      }
      resetCompanyModalState();
      return;
    }

    // ── Modo alta: crea una empresa nueva ──
    const newCompPayload = {
      nombreEmpresa: form.nombreEmpresa,
      cuit: form.cuit || ('30-' + Math.floor(10000000 + Math.random() * 90000000) + '-9'),
      tipoEmpresa: form.tipoEmpresa,
      direccionEmpresa: form.direccionEmpresa || 'Ruta Provincial',
      localidad: form.localidad,
      localityCodPostal: form.localityCodPostal || '2170',
      superficieHa: form.superficieHa === '' ? null : Number(form.superficieHa),
      proveedorActual: form.proveedorActual,
      descEmpresa: form.descEmpresa,
      creadoPorId: form.creadoPorId || currentUser?.idUser || null,
      fechaRegistro: new Date().toISOString(),
      existingContactNumDoc: (includeContact && contactMode === 'existing' && selectedExistingContact) ? (selectedExistingContact.numDoc || selectedExistingContact.id) : null,
      newContact: (includeContact && contactMode === 'new' && newContact.nombreApellido.trim()) ? {
        nombreApellido: newContact.nombreApellido.trim(),
        tipoClient: newContact.tipoClient || 'Encargado de Planta',
        telefono: newContact.telefono ? newContact.telefono.trim() : '',
        direccionMail: newContact.direccionMail ? newContact.direccionMail.trim() : '',
        numDoc: newContact.numDoc ? newContact.numDoc.trim() : undefined,
        codigoPostal: form.localityCodPostal || '2170',
        nota: newContact.nota || ('Contacto referente de ' + form.nombreEmpresa),
      } : null,
    };

    try {
      const response = await createClientCompany(newCompPayload);
      const createdCompany = response?.data || response || { id: Date.now(), ...newCompPayload };
      const companyId = createdCompany.id;
      const creador = users.find((u) => u.idUser === newCompPayload.creadoPorId);

      setCompanies(prev => [{ ...createdCompany, creadoPorNombre: creador?.nombreApellido || null }, ...prev]);

      if (includeContact && contactMode === 'existing' && selectedExistingContact) {
        setClients(prevClients => prevClients.map(cl => {
          if (cl.numDoc === selectedExistingContact.numDoc || cl.id === selectedExistingContact.id) {
            return {
              ...cl,
              clientCompanyId: companyId,
              empresa: createdCompany.nombreEmpresa,
            };
          }
          return cl;
        }));
      } else if (includeContact && contactMode === 'new' && newContact.nombreApellido.trim()) {
        const createdContact = response?.contact || {
          numDoc: newContact.numDoc || ('20-' + Math.floor(10000000 + Math.random() * 90000000) + '-4'),
          nombreApellido: newContact.nombreApellido.trim(),
          direccionMail: newContact.direccionMail,
          tipoClient: newContact.tipoClient || 'Encargado de Planta',
          localidad: form.localidad || 'Casilda',
          codigoPostal: form.localityCodPostal || '2170',
          telefonos: newContact.telefono ? [newContact.telefono] : [],
          clientCompanyId: companyId,
          empresa: createdCompany.nombreEmpresa,
          fechaAgregado: new Date().toISOString(),
        };
        setClients(prevClients => [createdContact, ...prevClients]);
      }
    } catch (err) {
      console.error('Error al registrar empresa:', err);
      alert('No se pudo registrar la empresa.');
      return;
    }

    resetCompanyModalState();
  };

  const handleDeleteCompany = async (company) => {
    if (!window.confirm(`¿Eliminar la empresa "${company.nombreEmpresa}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteClientCompany(company.id);
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    } catch (err) {
      console.error('Error al eliminar empresa:', err);
      alert('No se pudo eliminar la empresa.');
    }
  };

  const handleExportCompanies = () => {
    const headers = [
      { key: 'nombreEmpresa', label: 'Empresa / Razón Social' },
      { key: 'cuit', label: 'CUIT' },
      { key: 'tipoEmpresa', label: 'Tipo de Empresa' },
      { key: 'superficieHa', label: 'Superficie (ha)' },
      { key: 'proveedorActual', label: 'Proveedor Actual' },
      { key: 'localidad', label: 'Localidad' },
      { key: 'direccionEmpresa', label: 'Dirección' },
    ];

    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.label}"`).join(','));

    filteredCompanies.forEach(comp => {
      const row = headers.map(h => {
        let val = comp[h.key];
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `empresas_agroros_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to get related data for selected company (1:N)
  const relatedContacts = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return clients.filter(c =>
      c.clientCompanyId === selectedCompanyForDetail.id ||
      c.empresa?.toLowerCase() === selectedCompanyForDetail.nombreEmpresa?.toLowerCase()
    );
  }, [clients, selectedCompanyForDetail]);

  const relatedOpportunities = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return opportunities.filter(o =>
      o.clientCompanyId === selectedCompanyForDetail.id ||
      o.empresa?.toLowerCase() === selectedCompanyForDetail.nombreEmpresa?.toLowerCase()
    );
  }, [opportunities, selectedCompanyForDetail]);

  const relatedActivities = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return activities.filter(a =>
      a.empresa?.toLowerCase() === selectedCompanyForDetail.nombreEmpresa?.toLowerCase()
    );
  }, [activities, selectedCompanyForDetail]);

  return (
    <div className="companies-page">
      {/* Header */}
      <div className="companies-page__header">
        <div>
          <h1 className="companies-page__title">Empresas Clientes</h1>
        </div>
        <div className="crm-page-header-actions">
          <button className="crm-btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Agregar empresa
          </button>
          <button
            className="crm-btn-export"
            onClick={handleExportCompanies}
            title="Exportar empresas a planilla CSV/Excel"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="companies-page__card">
        {/* Contador */}
        <div className="contacts-page__tabs">
          <span className="contacts-page__tab contacts-page__tab--active">
            Todas las empresas
            <span className="contacts-page__tab-badge">{companies.length}</span>
          </span>
        </div>

        {/* Toolbar */}
        <div className="companies-page__toolbar">
          <div className="companies-page__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por empresa, CUIT, localidad o tipo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="contacts-page__toolbar-actions">
            <button
              className={`contacts-page__filter-btn ${showFilters || typeFilter ? 'contacts-page__filter-btn--active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Tipo de empresa
              {typeFilter && <span className="contacts-page__filter-active-dot" />}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="contacts-page__filter-panel">
            <span className="contacts-page__filter-panel-label">Filtrar por tipo:</span>
            <button
              className={`contacts-page__filter-chip ${!typeFilter ? 'contacts-page__filter-chip--active' : ''}`}
              onClick={() => { setTypeFilter(''); setCurrentPage(1); }}
            >
              Todos
            </button>
            {TIPO_EMPRESA_OPTIONS.map((type) => (
              <button
                key={type}
                className={`contacts-page__filter-chip ${typeFilter === type ? 'contacts-page__filter-chip--active' : ''}`}
                onClick={() => { setTypeFilter(typeFilter === type ? '' : type); setCurrentPage(1); }}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        {loadError && !loading && (
          <div style={{ padding: '12px 16px', marginBottom: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
            {loadError}
          </div>
        )}
        {loading ? (
          <div style={{ padding: '20px' }}>
            <LoadingState
              title="Conectando con la base de datos…"
              message="Aguardá un instante mientras traemos las empresas registradas."
            />
          </div>
        ) : (
        <div className="companies-page__table-wrapper">
          <table className="companies-table">
            <thead>
              <tr>
                <th className="companies-table__checkbox-col">
                  <input
                    type="checkbox"
                    checked={paginatedCompanies.length > 0 && selectedRows.length === paginatedCompanies.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={col.sortable ? 'sortable' : ''}
                  >
                    <div className="th-content">
                      {col.label}
                      {col.sortable && sortBy === col.key && (
                        sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      )}
                    </div>
                  </th>
                ))}
                <th className="companies-table__actions-header">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="companies-table__empty">
                    No se encontraron empresas
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map(company => (
                  <tr
                    key={company.id}
                    className={`companies-table__row ${selectedRows.includes(company.id) ? 'selected' : ''}`}
                    onClick={() => setSelectedCompanyForDetail(company)}
                  >
                    <td className="companies-table__checkbox-col" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(company.id)}
                        onChange={() => toggleSelect(company.id)}
                      />
                    </td>
                    <td>
                      <div className="companies-table__name-cell">
                        <div className="companies-table__avatar">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="companies-table__name">{company.nombreEmpresa}</span>
                            {company.nivelEmpresa === 'madre' && (
                              <span className="company-tree__madre-label" title="Empresa con regiones y subsedes">(Regional)</span>
                            )}
                          </div>
                          {company.descEmpresa && (
                            <span className="companies-table__desc">{company.descEmpresa}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="companies-table__cuit">{company.cuit}</td>
                    <td>
                      <span className={`companies-table__badge companies-table__badge--${(company.tipoEmpresa || 'productor').toLowerCase()}`}>
                        {company.tipoEmpresa}
                      </span>
                    </td>
                    <td>{company.Locality?.nomLocalidad || company.localidad || '-'}</td>
                    <td>
                      {companyContactMap.get(company.id)
                        ? companyContactMap.get(company.id).nombreApellido
                        : <span className="companies-table__provider">Sin contacto asociado</span>}
                    </td>
                    <td>
                      <span className="companies-table__provider">
                        {company.proveedorActual || 'Sin especificar'}
                      </span>
                    </td>
                    <td>
                      {company.creadoPorNombre ? (
                        <span className="companies-table__owner">{company.creadoPorNombre}</span>
                      ) : (
                        <span className="companies-table__provider">Sin especificar</span>
                      )}
                    </td>
                    <td className="companies-table__date">{formatDate(company.fechaRegistro)}</td>
                    <td className="companies-table__surface">
                      {company.superficieHa ? <Ruler size={13} className="inline-icon" /> : null}
                      {formatSurface(company.superficieHa)}
                    </td>
                    <td className="companies-table__actions-col" onClick={e => e.stopPropagation()}>
                      <div className="companies-table__actions">
                        {company.nivelEmpresa === 'madre' && (
                          <button
                            className="companies-table__action-btn"
                            title="Inspeccionar regiones y subsedes"
                            onClick={() => setInspectingCompanyId(company.id)}
                          >
                            <Network size={15} />
                          </button>
                        )}
                        <button
                          className="companies-table__action-btn"
                          title="Editar empresa"
                          onClick={() => openEditModal(company)}
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          className="companies-table__action-btn companies-table__action-btn--danger"
                          title="Eliminar"
                          onClick={() => handleDeleteCompany(company)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="companies-page__pagination">
            <span className="companies-page__pagination-info">
              {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredCompanies.length)} de {filteredCompanies.length} empresas
            </span>
            <div className="companies-page__pagination-controls">
              <button
                className="companies-page__page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`companies-page__page-btn ${currentPage === page ? 'companies-page__page-btn--active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="companies-page__page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Registrar Empresa Cliente ── */}
      {showModal && (
        <div className="comp-modal-overlay" {...companyModalOverlayHandlers}>
          <div className="comp-modal" onClick={e => e.stopPropagation()}>
            <div className="comp-modal__header">
              <h2>{editingCompany ? 'Editar Empresa Cliente' : 'Registrar Empresa Cliente'}</h2>
              <button className="comp-modal__close" onClick={() => { setShowModal(false); setEditingCompany(null); }}>
                <X size={20} />
              </button>
            </div>

            <form className="comp-modal__form" onSubmit={handleSubmit}>
              {/* Nombre Empresa */}
              <div className="comp-field">
                <label><Building2 size={14} /> Nombre / Razón Social de la Empresa *</label>
                <input
                  type="text"
                  className="comp-input"
                  placeholder="Ej: Campo Grande S.R.L."
                  value={form.nombreEmpresa}
                  onChange={(e) => setForm(prev => ({ ...prev, nombreEmpresa: e.target.value }))}
                  required
                />
              </div>

              {/* CUIT */}
              <div className="comp-field">
                <label><FileText size={14} /> CUIT de la Empresa *</label>
                <input
                  type="text"
                  className="comp-input"
                  placeholder="30-71234567-9"
                  value={form.cuit}
                  onChange={(e) => setForm(prev => ({ ...prev, cuit: e.target.value }))}
                  required
                />
              </div>

              {/* Tipo Empresa */}
              <div className="comp-field">
                <label>Tipo de Empresa</label>
                <select
                  className="comp-select"
                  value={form.tipoEmpresa}
                  onChange={(e) => setForm(prev => ({ ...prev, tipoEmpresa: e.target.value }))}
                >
                  <option value="Productor">Productor</option>
                  <option value="Distribuidor">Distribuidor</option>
                  <option value="Cooperativa">Cooperativa</option>
                  <option value="Acopiador">Acopiador</option>
                </select>
              </div>

              {/* Propietario del Registro */}
              <div className="comp-field">
                <label><UserCheck size={14} /> Propietario del Registro</label>
                <select
                  className="comp-select"
                  value={form.creadoPorId}
                  onChange={(e) => setForm(prev => ({ ...prev, creadoPorId: e.target.value }))}
                >
                  <option value="">Sin especificar</option>
                  {users.map((u) => (
                    <option key={u.idUser} value={u.idUser}>
                      {u.nombreApellido || u.idUser} ({(u.role || '').toLowerCase() === 'admin' ? 'Administrador' : 'Vendedor'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dirección & Localidad */}
              <div className="comp-field-row">
                <div className="comp-field" style={{ flex: 2 }}>
                  <label><MapPin size={14} /> Dirección</label>
                  <input
                    type="text"
                    className="comp-input"
                    placeholder="-"
                    value={form.direccionEmpresa}
                    onChange={(e) => setForm(prev => ({ ...prev, direccionEmpresa: e.target.value }))}
                  />
                </div>
                <div className="comp-field" style={{ flex: 1 }}>
                  <label>Localidad</label>
                  <input
                    type="text"
                    className="comp-input"
                    placeholder="Casilda"
                    value={form.localidad}
                    onChange={(e) => setForm(prev => ({ ...prev, localidad: e.target.value }))}
                  />
                </div>
              </div>

              {/* Superficie Ha & Proveedor Actual */}
              <div className="comp-field-row">
                <div className="comp-field" style={{ flex: 1 }}>
                  <label><Ruler size={14} /> Superficie (Ha)</label>
                  <input
                    type="number"
                    className="comp-input"
                    placeholder="-"
                    value={form.superficieHa}
                    onChange={(e) => setForm(prev => ({ ...prev, superficieHa: e.target.value }))}
                  />
                </div>
                <div className="comp-field" style={{ flex: 1 }}>
                  <label><Truck size={14} /> Proveedor Actual</label>
                  <input
                    type="text"
                    className="comp-input"
                    placeholder="-"
                    value={form.proveedorActual}
                    onChange={(e) => setForm(prev => ({ ...prev, proveedorActual: e.target.value }))}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="comp-field">
                <label>Descripción / Observaciones</label>
                <textarea
                  className="comp-textarea"
                  rows={3}
                  placeholder="Información adicional sobre la empresa o tipo de explotación..."
                  value={form.descEmpresa}
                  onChange={(e) => setForm(prev => ({ ...prev, descEmpresa: e.target.value }))}
                />
              </div>

              {/* ── Empresa con regiones (Empresa Madre -> Regiones -> Subsedes), solo al crear ── */}
              {!editingCompany && (
                <div className="comp-contact-section">
                  <div className="comp-contact-section__header">
                    <FlipCheckbox
                      id="esConRegiones"
                      checked={esConRegiones}
                      onChange={(e) => setEsConRegiones(e.target.checked)}
                    />
                    <label htmlFor="esConRegiones" className="comp-checkbox-label-content">
                      <span className="comp-checkbox-title">¿Es una empresa con regiones?</span>
                    </label>
                  </div>

                  {esConRegiones && (
                    <div className="company-hierarchy-form">
                      <div className="comp-field">
                        <label><User size={14} /> Encargado General de la Empresa</label>
                        <input
                          type="text"
                          className="comp-input"
                          placeholder="Ej: Ing. Roberto Sánchez"
                          value={encargadoGeneral}
                          onChange={(e) => setEncargadoGeneral(e.target.value)}
                        />
                      </div>

                      <div className="company-hierarchy-form__regions">
                        {regiones.map((region, rIdx) => (
                          <div key={rIdx} className="company-hierarchy-form__region-block">
                            <div className="company-hierarchy-form__region-header">
                              <span>Región #{rIdx + 1}</span>
                              <button type="button" className="company-hierarchy-form__remove" onClick={() => removeRegion(rIdx)}>
                                <X size={13} /> Quitar región
                              </button>
                            </div>
                            <div className="comp-field-row">
                              <div className="comp-field" style={{ flex: 1 }}>
                                <label>Nombre de la Región *</label>
                                <input type="text" className="comp-input" placeholder="Ej: Regional 1" value={region.nombre} onChange={(e) => updateRegion(rIdx, 'nombre', e.target.value)} />
                              </div>
                              <div className="comp-field" style={{ flex: 1 }}>
                                <label>Encargado Regional</label>
                                <input type="text" className="comp-input" placeholder="Nombre y apellido" value={region.encargado} onChange={(e) => updateRegion(rIdx, 'encargado', e.target.value)} />
                              </div>
                            </div>
                            <div className="comp-field">
                              <label><MapPin size={14} /> Sede Principal de la Región</label>
                              <input type="text" className="comp-input" placeholder="Dirección de la sede regional" value={region.sedePrincipal} onChange={(e) => updateRegion(rIdx, 'sedePrincipal', e.target.value)} />
                            </div>

                            <div className="company-hierarchy-form__subsedes">
                              {region.subsedes.map((sub, sIdx) => (
                                <div key={sIdx} className="company-hierarchy-form__subsede-block">
                                  <div className="comp-field-row">
                                    <div className="comp-field" style={{ flex: 1 }}>
                                      <label>Subsede #{sIdx + 1}</label>
                                      <input type="text" className="comp-input" placeholder="Ej: Sub Centro A" value={sub.nombre} onChange={(e) => updateSubsede(rIdx, sIdx, 'nombre', e.target.value)} />
                                    </div>
                                    <div className="comp-field" style={{ flex: 1 }}>
                                      <label>Encargado de Planta</label>
                                      <input type="text" className="comp-input" placeholder="Nombre y apellido" value={sub.encargado} onChange={(e) => updateSubsede(rIdx, sIdx, 'encargado', e.target.value)} />
                                    </div>
                                    <button type="button" className="company-hierarchy-form__remove-sub" onClick={() => removeSubsede(rIdx, sIdx)} title="Quitar subsede">
                                      <X size={13} />
                                    </button>
                                  </div>
                                  <input type="text" className="comp-input" placeholder="Dirección de la subsede (opcional)" value={sub.direccion} onChange={(e) => updateSubsede(rIdx, sIdx, 'direccion', e.target.value)} />
                                </div>
                              ))}
                              <button type="button" className="company-hierarchy-form__add-sub" onClick={() => addSubsede(rIdx)}>
                                <Plus size={13} /> Agregar Subsede
                              </button>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="company-hierarchy-form__add-region" onClick={addRegion}>
                          <Plus size={14} /> Agregar Región
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botones */}
              {/* ── Sección: Contacto Referente / Encargado de la Empresa (solo al crear, y no para empresas con regiones) ── */}
              {!editingCompany && !esConRegiones && (
              <div className="comp-contact-section">
                <div className="comp-contact-section__header">
                  <FlipCheckbox
                    id="includeContact"
                    checked={includeContact}
                    onChange={(e) => {
                      setIncludeContact(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedExistingContact(null);
                        setContactSearchQuery('');
                        setContactDropdownOpen(false);
                      }
                    }}
                  />
                  <label htmlFor="includeContact" className="comp-checkbox-label-content">
                    <span className="comp-checkbox-title">Asociar o dar de alta un contacto referente</span>
                    <span className="comp-checkbox-subtitle">Vincular un encargado o responsable con esta empresa</span>
                  </label>
                </div>

                {/* Solo visible si el checkbox está activo (tickeado) */}
                {includeContact && (
                  <div className="comp-contact-body-active">
                    {/* Selector de Modo: Solo 2 opciones limpias */}
                    <div className="comp-contact-mode-pills">
                      <button
                        type="button"
                        className={`comp-contact-mode-btn ${contactMode === 'existing' ? 'active' : ''}`}
                        onClick={() => {
                          setContactMode('existing');
                          setContactDropdownOpen(false);
                        }}
                      >
                        <Search size={14} />
                        <span>Buscar Contacto Existente</span>
                      </button>
                      <button
                        type="button"
                        className={`comp-contact-mode-btn ${contactMode === 'new' ? 'active' : ''}`}
                        onClick={() => {
                          setContactMode('new');
                          setContactDropdownOpen(false);
                        }}
                      >
                        <UserPlus size={14} />
                        <span>Dar de Alta Nuevo Contacto</span>
                      </button>
                    </div>

                    {/* MODO 1: BUSCAR CONTACTO EXISTENTE */}
                    {contactMode === 'existing' && (
                      <div className="comp-contact-existing-box">
                        {!selectedExistingContact ? (
                          <div ref={contactSearchRef} className="comp-contact-search-wrap">
                            <label className="comp-contact-sublabel">
                              Escribí el nombre del contacto al que asociás esta empresa:
                            </label>
                            <div className="comp-contact-search-input-box">
                              <Search size={16} className="comp-search-icon" />
                              <input
                                type="text"
                                className="comp-input comp-contact-search-input"
                                placeholder="Escribí el nombre, apellido, DNI o email..."
                                value={contactSearchQuery}
                                onChange={(e) => {
                                  setContactSearchQuery(e.target.value);
                                  setContactDropdownOpen(true);
                                }}
                                onFocus={() => setContactDropdownOpen(true)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setContactDropdownOpen(false);
                                }}
                              />
                              {contactSearchQuery && (
                                <button
                                  type="button"
                                  className="comp-search-clear-btn"
                                  onClick={() => {
                                    setContactSearchQuery('');
                                    setContactDropdownOpen(false);
                                  }}
                                  title="Limpiar búsqueda"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>

                            {/* Menú desplegable flotante de resultados con opción de cierre */}
                            {contactDropdownOpen && (
                              <div className="comp-contact-dropdown">
                                <div className="comp-contact-dropdown-header">
                                  <span>Contactos encontrados ({filteredContactsForSearch.length})</span>
                                  <button
                                    type="button"
                                    className="comp-dropdown-close-btn"
                                    onClick={() => setContactDropdownOpen(false)}
                                    title="Cerrar sugerencias (Esc)"
                                  >
                                    <X size={13} />
                                    <span>Cerrar lista</span>
                                  </button>
                                </div>

                                <div className="comp-contact-dropdown-items">
                                  {filteredContactsForSearch.length > 0 ? (
                                    filteredContactsForSearch.slice(0, 8).map((c) => (
                                      <div
                                        key={c.numDoc || c.id}
                                        className="comp-contact-dropdown-item"
                                        onClick={() => {
                                          setSelectedExistingContact(c);
                                          setContactSearchQuery('');
                                          setContactDropdownOpen(false);
                                        }}
                                      >
                                        <div className="comp-contact-item-avatar">
                                          {(c.nombreApellido || c.nombre || 'C').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="comp-contact-item-info">
                                          <div className="comp-contact-item-name">
                                            <strong>{c.nombreApellido || (c.nombre || '') + ' ' + (c.apellido || '')}</strong>
                                            <span className="comp-contact-item-role">{c.tipoClient || 'Contacto'}</span>
                                          </div>
                                          <div className="comp-contact-item-meta">
                                            {c.direccionMail && <span>{c.direccionMail}</span>}
                                            {c.telefonos && <span> • {Array.isArray(c.telefonos) ? c.telefonos[0] : c.telefonos}</span>}
                                            {(c.localidad || c.codigoPostal) && <span> • {c.localidad || c.codigoPostal}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="comp-contact-dropdown-empty">
                                      <p>No se encontró ningún contacto con "{contactSearchQuery}".</p>
                                      <button
                                        type="button"
                                        className="comp-contact-quick-new-btn"
                                        onClick={() => {
                                          setNewContact(prev => ({ ...prev, nombreApellido: contactSearchQuery }));
                                          setContactMode('new');
                                          setContactDropdownOpen(false);
                                        }}
                                      >
                                        <UserPlus size={13} />
                                        <span>Dar de alta como nuevo contacto</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Tarjeta de Contacto Seleccionado */
                          <div className="comp-selected-contact-card">
                            <div className="comp-selected-contact-left">
                              <div className="comp-selected-avatar">
                                <CheckCircle2 size={16} className="comp-selected-check" />
                                <span>{(selectedExistingContact.nombreApellido || 'C').charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="comp-selected-info">
                                <span className="comp-selected-tag">CONTACTO ASOCIADO</span>
                                <strong className="comp-selected-name">{selectedExistingContact.nombreApellido}</strong>
                                <div className="comp-selected-sub">
                                  <span className="comp-badge-role">{selectedExistingContact.tipoClient || 'Contacto'}</span>
                                  {selectedExistingContact.direccionMail && (
                                    <span className="comp-selected-mail">
                                      <Mail size={11} /> {selectedExistingContact.direccionMail}
                                    </span>
                                  )}
                                  {selectedExistingContact.telefonos && (
                                    <span className="comp-selected-phone">
                                      <Phone size={11} /> {Array.isArray(selectedExistingContact.telefonos) ? selectedExistingContact.telefonos[0] : selectedExistingContact.telefonos}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="comp-selected-remove-btn"
                              title="Cambiar o desasociar contacto"
                              onClick={() => {
                                setSelectedExistingContact(null);
                                setContactSearchQuery('');
                              }}
                            >
                              <X size={15} />
                              <span>Cambiar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* MODO 2: DAR DE ALTA NUEVO CONTACTO */}
                    {contactMode === 'new' && (
                      <div className="comp-contact-new-box">
                        <div className="comp-field">
                          <label><User size={14} /> Nombre y Apellido del Contacto *</label>
                          <input
                            type="text"
                            className="comp-input"
                            placeholder="Ej: Ing. Carlos Mendoza"
                            value={newContact.nombreApellido}
                            onChange={(e) => setNewContact(prev => ({ ...prev, nombreApellido: e.target.value }))}
                            required={includeContact && contactMode === 'new'}
                          />
                        </div>

                        <div className="comp-field-row">
                          <div className="comp-field" style={{ flex: 1.2 }}>
                            <label><Briefcase size={14} /> Rol / Puesto</label>
                            <select
                              className="comp-select"
                              value={newContact.tipoClient}
                              onChange={(e) => setNewContact(prev => ({ ...prev, tipoClient: e.target.value }))}
                            >
                              <option value="Encargado Regional">Encargado Regional</option>
                              <option value="Encargado de Planta">Encargado de Planta</option>
                              <option value="Dueño / Titular">Dueño / Titular</option>
                              <option value="Asesor Técnico">Asesor Técnico</option>
                              <option value="Gerente Comercial">Gerente Comercial</option>
                              <option value="Productor">Productor</option>
                              <option value="Administrador">Administrador</option>
                            </select>
                          </div>
                          <div className="comp-field" style={{ flex: 1 }}>
                            <label><Phone size={14} /> Teléfono / WhatsApp</label>
                            <input
                              type="text"
                              className="comp-input"
                              placeholder="+54 341 555-0123"
                              value={newContact.telefono}
                              onChange={(e) => setNewContact(prev => ({ ...prev, telefono: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="comp-field-row">
                          <div className="comp-field" style={{ flex: 1.2 }}>
                            <label><Mail size={14} /> Correo Electrónico</label>
                            <input
                              type="email"
                              className="comp-input"
                              placeholder="contacto@empresa.com"
                              value={newContact.direccionMail}
                              onChange={(e) => setNewContact(prev => ({ ...prev, direccionMail: e.target.value }))}
                            />
                          </div>
                          <div className="comp-field" style={{ flex: 1 }}>
                            <label><FileText size={14} /> DNI / CUIT (Opcional)</label>
                            <input
                              type="text"
                              className="comp-input"
                              placeholder="20-35441223-4"
                              value={newContact.numDoc}
                              onChange={(e) => setNewContact(prev => ({ ...prev, numDoc: e.target.value }))}
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Botones de Acción con shadcn/ui Button */}
              <div className="comp-modal__actions">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => { setShowModal(false); setEditingCompany(null); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Building2}
                  disabled={creandoJerarquia}
                >
                  {creandoJerarquia
                    ? 'Guardando estructura…'
                    : editingCompany ? 'Guardar Cambios' : esConRegiones ? 'Guardar Empresa y Estructura' : 'Registrar Empresa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 360° Drawer / Ficha Relacional de Empresa (1:N) ── */}
      {selectedCompanyForDetail && (
        <div className="comp-modal-overlay" {...companyDetailOverlayHandlers}>
          <div className="comp-modal comp-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="comp-modal__header">
              <div className="comp-detail-header-box">
                <div className="companies-table__avatar" style={{ width: '40px', height: '40px' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h2>{selectedCompanyForDetail.nombreEmpresa}</h2>
                  <span className="comp-detail-sub">
                    CUIT: {selectedCompanyForDetail.cuit} · {selectedCompanyForDetail.localidad} ({selectedCompanyForDetail.tipoEmpresa})
                  </span>
                </div>
              </div>
              <button className="comp-modal__close" onClick={() => setSelectedCompanyForDetail(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Relational Tabs */}
            <div className="comp-detail-tabs">
              <button
                type="button"
                className={`comp-tab-btn ${detailActiveTab === 'contactos' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('contactos')}
              >
                <Users size={15} />
                <span>Contactos Vinculados ({relatedContacts.length})</span>
              </button>
              <button
                type="button"
                className={`comp-tab-btn ${detailActiveTab === 'negocios' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('negocios')}
              >
                <Handshake size={15} />
                <span>Negocios / Oportunidades ({relatedOpportunities.length})</span>
              </button>
              <button
                type="button"
                className={`comp-tab-btn ${detailActiveTab === 'actividades' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('actividades')}
              >
                <ClipboardList size={15} />
                <span>Actividades en Campo ({relatedActivities.length})</span>
              </button>
            </div>

            {/* Detail Body */}
            <div className="comp-detail-body">
              {/* TAB 1: Contactos (1:N ClientCompany -> Clients) */}
              {detailActiveTab === 'contactos' && (
                <div className="relational-list">
                  {relatedContacts.length === 0 ? (
                    <div className="relational-empty">
                      <Users size={32} className="text-muted" />
                      <p>No hay contactos vinculados a esta empresa aún.</p>
                    </div>
                  ) : (
                    relatedContacts.map(c => (
                      <div key={c.id || c.numDoc} className="relational-card">
                        <div className="relational-card-left">
                          <div className="contact-avatar-mini">
                            {(c.nombreApellido || c.nombre || 'U').charAt(0)}
                          </div>
                          <div>
                            <strong className="relational-name">{c.nombreApellido || `${c.nombre || ''} ${c.apellido || ''}`}</strong>
                            <div className="relational-sub">
                              <span><Mail size={12} /> {c.direccionMail || c.email}</span>
                              {c.telefonos && <span><Phone size={12} /> {Array.isArray(c.telefonos) ? c.telefonos[0] : c.telefonos}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="relational-badge">{c.tipoClient || 'Socio'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: Negocios (1:N ClientCompany -> Opportunities) */}
              {detailActiveTab === 'negocios' && (
                <div className="relational-list">
                  {relatedOpportunities.length === 0 ? (
                    <div className="relational-empty">
                      <Handshake size={32} className="text-muted" />
                      <p>No hay negocios abiertos para esta empresa.</p>
                    </div>
                  ) : (
                    relatedOpportunities.map(o => (
                      <div key={o.id} className="relational-card">
                        <div className="relational-card-left">
                          <div className="deal-icon-mini">
                            <DollarSign size={16} />
                          </div>
                          <div>
                            <strong className="relational-name">{o.nombreNegocio || o.pipeline || 'Oportunidad'}</strong>
                            <div className="relational-sub">
                              <span>Vendedor: {o.propietario || o.vendedor || 'Equipo AgroRos'}</span>
                              <span>· Cierre: {o.fechaCierre || o.fechaInicio}</span>
                            </div>
                          </div>
                        </div>
                        <div className="relational-card-right">
                          <strong className="deal-amount-text">{formatCurrency(o.valor || o.volumenPotencial)}</strong>
                          <span className="deal-stage-mini-pill">{o.estado}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: Actividades (1:N ClientCompany -> Activities) */}
              {detailActiveTab === 'actividades' && (
                <div className="relational-list">
                  {relatedActivities.length === 0 ? (
                    <div className="relational-empty">
                      <ClipboardList size={32} className="text-muted" />
                      <p>No hay registro de visitas o llamadas recientes con esta empresa.</p>
                    </div>
                  ) : (
                    relatedActivities.map(a => (
                      <div key={a.idFormulario || a.id} className="relational-card">
                        <div className="relational-card-left">
                          <div className="act-type-mini">
                            {a.tipoContacto === 'Visita' ? <MapPin size={15} /> : <Phone size={15} />}
                          </div>
                          <div>
                            <strong className="relational-name">{a.tipoContacto} por {a.vendedor}</strong>
                            <p className="relational-desc-text">{a.descripcion}</p>
                            <span className="relational-date-sub">{formatDate(a.fechaHora)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="comp-modal__actions">
              <button
                type="button"
                className="comp-modal__submit-btn"
                onClick={() => setSelectedCompanyForDetail(null)}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inspeccionar: Empresa Madre -> Regiones -> Subsedes ── */}
      {inspectingCompanyId && (
        <CompanyTreeModal companyId={inspectingCompanyId} onClose={() => setInspectingCompanyId(null)} />
      )}
    </div>
  );
};
