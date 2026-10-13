import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import { LocalitySelect } from '../../../components/ui/LocalitySelect/LocalitySelect';
import { useAuth } from '../../../context/AuthContext';
import {
  Search,
  Plus,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Ruler,
  X,
  FileText,
  Truck,
  Layers,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  UserCheck,
  UserPlus,
  Briefcase,
  CheckCircle2,
  User,
  ChevronUp,
  Network,
  Loader2,
} from 'lucide-react';
import { notify, errorMessage } from '../../../hooks/useNotifications';
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
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { FlipCheckbox } from '../../../components/ui/FlipCheckbox/FlipCheckbox';
import { CompanyTreeModal } from '../../../components/companies/CompanyTreeModal';
import { CompanySummary } from '../../../components/companies/CompanySummary';
import './CompaniesPage.css';

const COMPANY_TYPE_OPTIONS = ['Productor', 'Distribuidor', 'Cooperativa', 'Acopiador'];

const COLUMNS = [
  { key: 'companyName',     label: 'Empresa',               sortable: true },
  { key: 'cuit',              label: 'CUIT',                  sortable: true },
  { key: 'companyType',       label: 'Tipo',                  sortable: true },
  { key: 'locality',         label: 'Localidad',             sortable: true },
  { key: 'companyAddress',  label: 'Dirección',             sortable: true },
  { key: 'associatedContact',  label: 'Contacto Asociado',     sortable: false },
  { key: 'currentSupplier',   label: 'Proveedor Actual',      sortable: true },
  { key: 'createdByName',   label: 'Propietario del Registro', sortable: false },
  { key: 'createdAt',     label: 'Registro',              sortable: true },
  { key: 'areaHa',      label: 'Superficie (Ha)',       sortable: true },
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
  const [sortBy, setSortBy] = useState('companyName');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState(null);
  const [inspectingCompanyId, setInspectingCompanyId] = useState(null);
  const companyModalOverlayHandlers = useOverlayClose(() => { setShowModal(false); setEditingCompany(null); });

  // Contact association state for "Registrar Empresa" modal
  const [includeContact, setIncludeContact] = useState(true); // Checkbox con tick
  const [contactMode, setContactMode] = useState('existing'); // 'existing' | 'new'
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [selectedExistingContact, setSelectedExistingContact] = useState(null);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const contactSearchRef = useRef(null);
  const [newContact, setNewContact] = useState({
    fullName: '',
    clientType: 'Encargado de Planta',
    phone: '',
    email: '',
    docNumber: '',
    note: '',
  });

  // ── Empresa con regiones (Empresa Madre -> Regiones -> Subsedes) ──
  const [hasRegions, setHasRegions] = useState(false);
  const [generalManager, setGeneralManager] = useState('');
  const emptyRegion = () => ({ name: '', manager: '', mainSite: '', branches: [] });
  const emptyBranch = () => ({ name: '', manager: '', address: '' });
  const [regions, setRegions] = useState([]);
  const [creatingHierarchy, setCreatingHierarchy] = useState(false);

  const addRegion = () => setRegions((prev) => [...prev, emptyRegion()]);
  const removeRegion = (idx) => setRegions((prev) => prev.filter((_, i) => i !== idx));
  const updateRegion = (idx, field, value) => setRegions((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  const addBranch = (regionIdx) => setRegions((prev) => prev.map((r, i) => (i === regionIdx ? { ...r, branches: [...r.branches, emptyBranch()] } : r)));
  const removeBranch = (regionIdx, subIdx) => setRegions((prev) => prev.map((r, i) => (i === regionIdx ? { ...r, branches: r.branches.filter((_, subIndex) => subIndex !== subIdx) } : r)));
  const updateBranch = (regionIdx, subIdx, field, value) => setRegions((prev) => prev.map((r, i) => (i === regionIdx ? {
    ...r,
    branches: r.branches.map((s, subIndex) => (subIndex === subIdx ? { ...s, [field]: value } : s)),
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
    companyName: '',
    cuit: '',
    companyType: 'Productor',
    companyAddress: '',
    locality: '',
    localityId: null,
    selectedLocality: null,
    areaHa: '',
    currentSupplier: '',
    companyDescription: '',
    createdById: currentUser?.idUser || '',
  };
  const [form, setForm] = useState(emptyCompanyForm);

  const openCreateModal = () => {
    setEditingCompany(null);
    setForm(emptyCompanyForm);
    setIncludeContact(true);
    setContactMode('existing');
    setSelectedExistingContact(null);
    setHasRegions(false);
    setGeneralManager('');
    setRegions([]);
    setShowModal(true);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setForm({
      companyName: company.legalName || company.companyName || '',
      cuit: company.cuit || '',
      companyType: company.companyType || 'Productor',
      companyAddress: company.companyAddress || '',
      locality: company.locality || '',
      localityId: company.localityId || null,
      selectedLocality: company.localityDetails ? { id: company.localityDetails.id, name: company.localityDetails.name, province: company.localityDetails.province } : null,
      areaHa: company.areaHa || '',
      currentSupplier: company.currentSupplier || '',
      companyDescription: company.companyDescription || '',
      createdById: company.createdById || '',
    });
    setIncludeContact(false);
    setHasRegions(false);
    setShowModal(true);
  };

  // Filter contacts for smart search in company registration modal
  const filteredContactsForSearch = useMemo(() => {
    if (!contactSearchQuery || !contactSearchQuery.trim()) {
      return clients.slice(0, 8);
    }
    const q = contactSearchQuery.toLowerCase().trim();
    return clients.filter(c =>
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.surname && c.surname.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.docNumber && c.docNumber.includes(q)) ||
      (c.locality && c.locality.toLowerCase().includes(q)) ||
      (c.clientType && c.clientType.toLowerCase().includes(q))
    );
  }, [clients, contactSearchQuery]);

  // El listado principal solo muestra el nivel superior (independientes y
  // empresas madre) — las regiones y subsedes se ven desde "Inspeccionar".
  // Una regional cuya empresa principal ya no existe se muestra igual, para que no quede invisible.
  const topLevelCompanies = useMemo(() => {
    const ids = new Set(companies.map((c) => c.id));
    return companies.filter((c) => !c.parentCompanyId || !ids.has(c.parentCompanyId));
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    let result = [...topLevelCompanies];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.cuit.includes(q) ||
        (c.Locality?.localityName || c.locality || '').toLowerCase().includes(q) ||
        c.companyType?.toLowerCase().includes(q) ||
        (c.createdByName || '').toLowerCase().includes(q)
      );
    }

    if (typeFilter) {
      result = result.filter((c) => c.companyType === typeFilter);
    }

    result.sort((a, b) => {
      const valA = (a[sortBy] ?? '').toString().toLowerCase();
      const valB = (b[sortBy] ?? '').toString().toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [topLevelCompanies, searchQuery, typeFilter, sortBy, sortDir]);

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

  // Si se borra la última empresa de la última página, volver a una página que exista
  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [currentPage, totalPages]);
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
      fullName: '',
      clientType: 'Encargado de Planta',
      phone: '',
      email: '',
      docNumber: '',
      note: '',
    });
    setHasRegions(false);
    setGeneralManager('');
    setRegions([]);
  };

  // Crea la empresa madre + cada región + cada subsede en secuencia (cada
  // nodo del árbol es una empresa más, enlazada por `parentCompanyId`), con
  // el encargado de cada nivel como un Contacto vinculado vía `newContact`.
  const handleCreateHierarchy = async () => {
    if (!form.companyName.trim()) {
      notify.warning('Falta el nombre', 'Ingresá el nombre de la empresa madre.');
      return false;
    }
    if (!form.cuit.trim()) {
      notify.warning('Falta el CUIT', 'Ingresá el CUIT de la empresa madre (las regiones y subsedes usan el mismo).');
      return false;
    }
    setCreatingHierarchy(true);
    try {
      const headOfficeRes = await createClientCompany({
        companyName: form.companyName,
        cuit: form.cuit.trim(),
        companyType: form.companyType,
        companyAddress: form.companyAddress || undefined,
        locality: form.localityId ? undefined : form.locality,
        localityId: form.localityId || undefined,
        companyDescription: form.companyDescription,
        createdById: form.createdById || currentUser?.idUser || null,
        parentCompanyId: null,
        companyLevel: 'madre',
        newContact: generalManager.trim() ? {
          fullName: generalManager.trim(),
          clientType: 'Encargado Regional',
          note: `Encargado general de ${form.companyName}`,
        } : null,
      });
      const headOffice = headOfficeRes?.data;
      if (!headOffice?.id) throw new Error('El servidor no confirmó el alta de la empresa madre.');
      const headOfficeCreator = users.find((u) => u.idUser === form.createdById);

      for (const region of regions) {
        if (!region.name.trim()) continue;
        const regionRes = await createClientCompany({
          companyName: region.name.trim(),
          cuit: headOffice.cuit,
          companyType: form.companyType,
          companyAddress: region.mainSite || undefined,
          locality: form.localityId ? undefined : form.locality,
          localityId: form.localityId || undefined,
          createdById: form.createdById || currentUser?.idUser || null,
          parentCompanyId: headOffice.id,
          companyLevel: 'region',
          newContact: region.manager.trim() ? {
            fullName: region.manager.trim(),
            clientType: 'Encargado Regional',
            note: `Encargado de la región ${region.name}`,
          } : null,
        });
        const regionCompany = regionRes?.data;
        if (!regionCompany?.id) throw new Error(`No se pudo crear la región ${region.name}.`);

        for (const sub of region.branches) {
          if (!sub.name.trim()) continue;
          await createClientCompany({
            companyName: sub.name.trim(),
            cuit: headOffice.cuit,
            companyType: form.companyType,
            companyAddress: sub.address || region.mainSite || undefined,
            locality: form.localityId ? undefined : form.locality,
            localityId: form.localityId || undefined,
            createdById: form.createdById || currentUser?.idUser || null,
            parentCompanyId: regionCompany.id,
            companyLevel: 'subsede',
            newContact: sub.manager.trim() ? {
              fullName: sub.manager.trim(),
              clientType: 'Encargado de Planta',
              note: `Encargado de la subsede ${sub.name}`,
            } : null,
          });
        }
      }

      setCompanies((prev) => [{ ...headOffice, createdByName: headOfficeCreator?.fullName || null }, ...prev]);
      notify.success('Empresa registrada', `«${headOffice.legalName}» se dio de alta con sus regiones y subsedes.`);
      return true;
    } catch (err) {
      console.error('Error al crear la jerarquía de empresa:', err);
      notify.error(
        'No se pudo crear la estructura',
        `${errorMessage(err, 'Revisá los datos y probá de nuevo.')} Puede que algunos niveles ya se hayan guardado.`
      );
      return false;
    } finally {
      setCreatingHierarchy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasRegions && !editingCompany) {
      const ok = await handleCreateHierarchy();
      if (ok) resetCompanyModalState();
      return;
    }

    if (includeContact && contactMode === 'new' && !newContact.fullName.trim()) {
      notify.warning('Falta el contacto', 'Ingresá el nombre y apellido del nuevo contacto.');
      return;
    }
    if (!form.companyName.trim() || !form.cuit.trim()) {
      notify.warning('Faltan datos', 'La razón social y el CUIT son obligatorios.');
      return;
    }

    // ── Modo edición: actualiza la empresa existente ──
    if (editingCompany) {
      const updatePayload = {
        companyName: form.companyName,
        cuit: form.cuit,
        companyType: form.companyType,
        companyAddress: form.companyAddress,
        locality: form.localityId ? undefined : form.locality,
        localityId: form.localityId || undefined,
        areaHa: form.areaHa === '' ? null : Number(form.areaHa),
        currentSupplier: form.currentSupplier,
        companyDescription: form.companyDescription,
        createdById: form.createdById || null,
      };
      try {
        const response = await updateClientCompany(editingCompany.id, updatePayload);
        const updatedCompany = response?.data || response;
        const creator = users.find((u) => u.idUser === form.createdById);
        setCompanies((prev) => prev.map((c) => (c.id === editingCompany.id ? {
          ...c,
          ...updatePayload,
          ...updatedCompany,
          createdByName: creator?.fullName || c.createdByName || null,
        } : c)));
        notify.success('Cambios guardados', `Se actualizó «${form.companyName}».`);
      } catch (err) {
        console.error('Error al editar empresa:', err);
        notify.error('No se pudieron guardar los cambios', err);
        return;
      }
      resetCompanyModalState();
      return;
    }

    // ── Modo alta: crea una empresa nueva ──
    const newCompPayload = {
      companyName: form.companyName,
      cuit: form.cuit.trim(),
      companyType: form.companyType,
      companyAddress: form.companyAddress || undefined,
      locality: form.localityId ? undefined : form.locality,
      localityId: form.localityId || undefined,
      areaHa: form.areaHa === '' ? null : Number(form.areaHa),
      currentSupplier: form.currentSupplier,
      companyDescription: form.companyDescription,
      createdById: form.createdById || currentUser?.idUser || null,
      existingContactId: (includeContact && contactMode === 'existing' && selectedExistingContact) ? selectedExistingContact.id : null,
      newContact: (includeContact && contactMode === 'new' && newContact.fullName.trim()) ? {
        fullName: newContact.fullName.trim(),
        clientType: newContact.clientType || 'Encargado de Planta',
        phone: newContact.phone ? newContact.phone.trim() : '',
        email: newContact.email ? newContact.email.trim() : '',
        docNumber: newContact.docNumber ? newContact.docNumber.trim() : undefined,
        note: newContact.note || ('Contacto referente de ' + form.companyName),
      } : null,
    };

    try {
      const response = await createClientCompany(newCompPayload);
      const createdCompany = response?.data;
      if (!createdCompany?.id) throw new Error('El servidor no confirmó el alta de la empresa.');
      const companyId = createdCompany.id;
      const creator = users.find((u) => u.idUser === newCompPayload.createdById);

      setCompanies(prev => [{ ...createdCompany, createdByName: creator?.fullName || null }, ...prev]);

      if (includeContact && contactMode === 'existing' && selectedExistingContact) {
        setClients(prevClients => prevClients.map(cl => {
          if (cl.id === selectedExistingContact.id) { // por id: el DNI es opcional y puede estar vacío
            return {
              ...cl,
              clientCompanyId: companyId,
              company: createdCompany.legalName,
            };
          }
          return cl;
        }));
      } else if (includeContact && contactMode === 'new' && newContact.fullName.trim()) {
        const createdContact = response?.contact;
        if (createdContact) setClients(prevClients => [createdContact, ...prevClients]);
      }
      notify.success('Empresa registrada', `«${createdCompany.legalName}» se dio de alta.`);
    } catch (err) {
      console.error('Error al registrar empresa:', err);
      notify.error('No se pudo registrar la empresa', err);
      return;
    }

    resetCompanyModalState();
  };

  const handleDeleteCompany = async (company) => {
    if (deletingId) return;
    // Baja lógica: la empresa deja de verse pero su historial (contactos, oportunidades, órdenes) se conserva.
    const contacts = 0;
    const regional = companies.filter((c) => c.parentCompanyId === company.id).length;
    const consequences = [
      contacts && `${contacts} contacto${contacts === 1 ? '' : 's'} vinculado${contacts === 1 ? '' : 's'} (se borran también)`,
      regional && `${regional} regional${regional === 1 ? '' : 'es'}/subsede${regional === 1 ? '' : 's'} que quedarán sin empresa principal`,
    ].filter(Boolean);
    const notice = consequences.length ? `\n\nAtención, tiene:\n• ${consequences.join('\n• ')}` : '';
    if (!window.confirm(`¿Dar de baja la empresa "${company.companyName}"? Deja de aparecer en las listas, pero su historial se conserva y la administración puede restaurarla.${notice}`)) return;

    setDeletingId(company.id);
    try {
      await notify.operation(deleteClientCompany(company.id), {
        loading: `Dando de baja «${company.companyName}»…`,
        success: 'Empresa dada de baja',
        error: 'No se pudo dar de baja la empresa',
      });
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      if (contacts) setClients((prev) => prev.filter((cl) => cl.clientCompanyId !== company.id));
      setSelectedRows((prev) => prev.filter((id) => id !== company.id));
    } catch (err) {
      console.error('Error al eliminar empresa:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCompanies = () => {
    const headers = [
      { key: 'companyName', label: 'Empresa / Razón Social' },
      { key: 'cuit', label: 'CUIT' },
      { key: 'companyType', label: 'Tipo de Empresa' },
      { key: 'areaHa', label: 'Superficie (ha)' },
      { key: 'currentSupplier', label: 'Proveedor Actual' },
      { key: 'locality', label: 'Localidad' },
      { key: 'companyAddress', label: 'Dirección' },
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
      c.company?.toLowerCase() === selectedCompanyForDetail.companyName?.toLowerCase()
    );
  }, [clients, selectedCompanyForDetail]);

  const relatedOpportunities = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return opportunities.filter(o =>
      o.clientCompanyId === selectedCompanyForDetail.id ||
      o.company?.toLowerCase() === selectedCompanyForDetail.companyName?.toLowerCase()
    );
  }, [opportunities, selectedCompanyForDetail]);

  const relatedActivities = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return activities.filter(a =>
      a.companyId === selectedCompanyForDetail.id ||
      a.company?.toLowerCase() === selectedCompanyForDetail.companyName?.toLowerCase()
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
        {/* Pestañas por tipo + búsqueda en una sola fila */}
        <div className="companies-page__toolbar crm-filterbar">
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

          <FilterTabs
            ariaLabel="Filtrar empresas por tipo"
            value={typeFilter}
            onChange={(t) => { setTypeFilter(t); setCurrentPage(1); }}
            items={[
              { value: '', label: 'Todas las empresas', count: topLevelCompanies.length },
              ...COMPANY_TYPE_OPTIONS.map((type) => ({
                value: type,
                label: type,
                count: topLevelCompanies.filter((c) => c.companyType === type).length,
              })),
            ]}
          />
        </div>

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
                            <button
                              type="button"
                              className="companies-table__name companies-table__name-btn"
                              onClick={() => setSelectedCompanyForDetail(company)}
                              title="Ver resumen de la empresa"
                            >
                              {company.companyName}
                            </button>
                            {company.companyLevel === 'madre' && (
                              <span className="company-tree__madre-label" title="Tiene regiones y sedes: se ven con «Inspeccionar»">Con sedes</span>
                            )}
                          </div>
                          {company.companyDescription && (
                            <span className="companies-table__desc" title={company.companyDescription}>{company.companyDescription}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="companies-table__cuit">{company.cuit}</td>
                    <td>
                      <span className={`companies-table__badge companies-table__badge--${(company.companyType || 'productor').toLowerCase()}`}>
                        {company.companyType}
                      </span>
                    </td>
                    <td>{company.Locality?.localityName || company.locality || '-'}</td>
                    <td className="companies-table__address">{company.companyAddress || '-'}</td>
                    <td>
                      {companyContactMap.get(company.id)
                        ? companyContactMap.get(company.id).fullName
                        : <span className="companies-table__provider">Sin contacto asociado</span>}
                    </td>
                    <td>
                      <span className="companies-table__provider">
                        {company.currentSupplier || 'Sin especificar'}
                      </span>
                    </td>
                    <td>
                      {company.createdByName ? (
                        <span className="companies-table__owner">{company.createdByName}</span>
                      ) : (
                        <span className="companies-table__provider">Sin especificar</span>
                      )}
                    </td>
                    <td className="companies-table__date">{formatDate(company.createdAt)}</td>
                    <td className="companies-table__surface">
                      {company.areaHa ? <Ruler size={13} className="inline-icon" /> : null}
                      {formatSurface(company.areaHa)}
                    </td>
                    <td className="companies-table__actions-col" onClick={e => e.stopPropagation()}>
                      <div className="companies-table__actions">
                        {company.companyLevel === 'madre' && (
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
                          <Pencil size={15} />
                        </button>
                        <button
                          className="companies-table__action-btn companies-table__action-btn--danger"
                          title={deletingId === company.id ? 'Eliminando…' : 'Eliminar'}
                          onClick={() => handleDeleteCompany(company)}
                          disabled={deletingId !== null}
                        >
                          {deletingId === company.id ? <Loader2 size={15} className="crm-spin" /> : <Trash2 size={15} />}
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
                  value={form.companyName}
                  onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
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
                  value={form.companyType}
                  onChange={(e) => setForm(prev => ({ ...prev, companyType: e.target.value }))}
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
                  value={form.createdById}
                  onChange={(e) => setForm(prev => ({ ...prev, createdById: e.target.value }))}
                >
                  <option value="">Sin especificar</option>
                  {users.map((u) => (
                    <option key={u.idUser} value={u.idUser}>
                      {u.fullName || u.idUser} ({(u.role || '').toLowerCase() === 'admin' ? 'Administrador' : 'Vendedor'})
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
                    value={form.companyAddress}
                    onChange={(e) => setForm(prev => ({ ...prev, companyAddress: e.target.value }))}
                  />
                </div>
                <div className="comp-field" style={{ flex: 1 }}>
                  <LocalitySelect
                    value={form.selectedLocality}
                    onChange={(l) => setForm(prev => ({ ...prev, selectedLocality: l, localityId: l?.id || null, locality: l?.name || '' }))}
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
                    value={form.areaHa}
                    onChange={(e) => setForm(prev => ({ ...prev, areaHa: e.target.value }))}
                  />
                </div>
                <div className="comp-field" style={{ flex: 1 }}>
                  <label><Truck size={14} /> Proveedor Actual</label>
                  <input
                    type="text"
                    className="comp-input"
                    placeholder="-"
                    value={form.currentSupplier}
                    onChange={(e) => setForm(prev => ({ ...prev, currentSupplier: e.target.value }))}
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
                  value={form.companyDescription}
                  onChange={(e) => setForm(prev => ({ ...prev, companyDescription: e.target.value }))}
                />
              </div>

              {/* ── Empresa con regiones (Empresa Madre -> Regiones -> Subsedes), solo al crear ── */}
              {!editingCompany && (
                <div className="comp-contact-section">
                  <div className="comp-contact-section__header">
                    <FlipCheckbox
                      id="hasRegions"
                      checked={hasRegions}
                      onChange={(e) => setHasRegions(e.target.checked)}
                    />
                    <label htmlFor="hasRegions" className="comp-checkbox-label-content">
                      <span className="comp-checkbox-title">¿Es una empresa con regiones?</span>
                    </label>
                  </div>

                  {hasRegions && (
                    <div className="company-hierarchy-form">
                      <div className="comp-field">
                        <label><User size={14} /> Encargado General de la Empresa</label>
                        <input
                          type="text"
                          className="comp-input"
                          placeholder="Ej: Ing. Roberto Sánchez"
                          value={generalManager}
                          onChange={(e) => setGeneralManager(e.target.value)}
                        />
                      </div>

                      <div className="company-hierarchy-form__regions">
                        {regions.map((region, rIdx) => (
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
                                <input type="text" className="comp-input" placeholder="Ej: Regional 1" value={region.name} onChange={(e) => updateRegion(rIdx, 'name', e.target.value)} />
                              </div>
                              <div className="comp-field" style={{ flex: 1 }}>
                                <label>Encargado Regional</label>
                                <input type="text" className="comp-input" placeholder="Nombre y apellido" value={region.manager} onChange={(e) => updateRegion(rIdx, 'manager', e.target.value)} />
                              </div>
                            </div>
                            <div className="comp-field">
                              <label><MapPin size={14} /> Sede Principal de la Región</label>
                              <input type="text" className="comp-input" placeholder="Dirección de la sede regional" value={region.mainSite} onChange={(e) => updateRegion(rIdx, 'mainSite', e.target.value)} />
                            </div>

                            <div className="company-hierarchy-form__subsedes">
                              {region.branches.map((sub, sIdx) => (
                                <div key={sIdx} className="company-hierarchy-form__subsede-block">
                                  <div className="comp-field-row">
                                    <div className="comp-field" style={{ flex: 1 }}>
                                      <label>Subsede #{sIdx + 1}</label>
                                      <input type="text" className="comp-input" placeholder="Ej: Sub Centro A" value={sub.name} onChange={(e) => updateBranch(rIdx, sIdx, 'name', e.target.value)} />
                                    </div>
                                    <div className="comp-field" style={{ flex: 1 }}>
                                      <label>Encargado de Planta</label>
                                      <input type="text" className="comp-input" placeholder="Nombre y apellido" value={sub.manager} onChange={(e) => updateBranch(rIdx, sIdx, 'manager', e.target.value)} />
                                    </div>
                                    <button type="button" className="company-hierarchy-form__remove-sub" onClick={() => removeBranch(rIdx, sIdx)} title="Quitar subsede">
                                      <X size={13} />
                                    </button>
                                  </div>
                                  <input type="text" className="comp-input" placeholder="Dirección de la subsede (opcional)" value={sub.address} onChange={(e) => updateBranch(rIdx, sIdx, 'address', e.target.value)} />
                                </div>
                              ))}
                              <button type="button" className="company-hierarchy-form__add-sub" onClick={() => addBranch(rIdx)}>
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
              {!editingCompany && !hasRegions && (
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
                                        key={c.id}
                                        className="comp-contact-dropdown-item"
                                        onClick={() => {
                                          setSelectedExistingContact(c);
                                          setContactSearchQuery('');
                                          setContactDropdownOpen(false);
                                        }}
                                      >
                                        <div className="comp-contact-item-avatar">
                                          {(c.fullName || c.name || 'C').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="comp-contact-item-info">
                                          <div className="comp-contact-item-name">
                                            <strong>{c.fullName || (c.name || '') + ' ' + (c.surname || '')}</strong>
                                            <span className="comp-contact-item-role">{c.clientType || 'Contacto'}</span>
                                          </div>
                                          <div className="comp-contact-item-meta">
                                            {c.email && <span>{c.email}</span>}
                                            {c.phones && <span> • {Array.isArray(c.phones) ? c.phones[0] : c.phones}</span>}
                                            {(c.locality || c.postalCode) && <span> • {c.locality || c.postalCode}</span>}
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
                                          setNewContact(prev => ({ ...prev, fullName: contactSearchQuery }));
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
                                <span>{(selectedExistingContact.fullName || 'C').charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="comp-selected-info">
                                <span className="comp-selected-tag">CONTACTO ASOCIADO</span>
                                <strong className="comp-selected-name">{selectedExistingContact.fullName}</strong>
                                <div className="comp-selected-sub">
                                  <span className="comp-badge-role">{selectedExistingContact.clientType || 'Contacto'}</span>
                                  {selectedExistingContact.email && (
                                    <span className="comp-selected-mail">
                                      <Mail size={11} /> {selectedExistingContact.email}
                                    </span>
                                  )}
                                  {selectedExistingContact.phones && (
                                    <span className="comp-selected-phone">
                                      <Phone size={11} /> {Array.isArray(selectedExistingContact.phones) ? selectedExistingContact.phones[0] : selectedExistingContact.phones}
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
                            value={newContact.fullName}
                            onChange={(e) => setNewContact(prev => ({ ...prev, fullName: e.target.value }))}
                            required={includeContact && contactMode === 'new'}
                          />
                        </div>

                        <div className="comp-field-row">
                          <div className="comp-field" style={{ flex: 1.2 }}>
                            <label><Briefcase size={14} /> Rol / Puesto</label>
                            <select
                              className="comp-select"
                              value={newContact.clientType}
                              onChange={(e) => setNewContact(prev => ({ ...prev, clientType: e.target.value }))}
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
                              value={newContact.phone}
                              onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
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
                              value={newContact.email}
                              onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div className="comp-field" style={{ flex: 1 }}>
                            <label><FileText size={14} /> DNI / CUIT (Opcional)</label>
                            <input
                              type="text"
                              className="comp-input"
                              placeholder="20-35441223-4"
                              value={newContact.docNumber}
                              onChange={(e) => setNewContact(prev => ({ ...prev, docNumber: e.target.value }))}
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
                  disabled={creatingHierarchy}
                >
                  {creatingHierarchy
                    ? 'Guardando estructura…'
                    : editingCompany ? 'Guardar Cambios' : hasRegions ? 'Guardar Empresa y Estructura' : 'Registrar Empresa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Ficha resumen de la empresa ── */}
      {selectedCompanyForDetail && (
        <CompanySummary
          company={selectedCompanyForDetail}
          contacts={relatedContacts}
          opportunities={relatedOpportunities}
          activities={relatedActivities}
          onClose={() => setSelectedCompanyForDetail(null)}
          onEdit={() => {
            const company = selectedCompanyForDetail;
            setSelectedCompanyForDetail(null);
            openEditModal(company);
          }}
        />
      )}

      {/* ── Inspeccionar: Empresa Madre -> Regiones -> Subsedes ── */}
      {inspectingCompanyId && (
        <CompanyTreeModal companyId={inspectingCompanyId} onClose={() => setInspectingCompanyId(null)} />
      )}
    </div>
  );
};
