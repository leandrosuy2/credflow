'use client';

import { useEffect, useState } from 'react';
import { Percent, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { vendasApi } from '@/lib/api';
import { toasts } from '@/lib/toast';
import { InputIcon } from '@/components/ui/InputIcon';

export default function AdminComissoesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ comissaoVendedor: '20', comissaoPreposto: '5' });

  const load = () =>
    vendasApi
      .configComissoes()
      .then((c) => {
        setForm({
          comissaoVendedor: String(c.comissaoVendedor),
          comissaoPreposto: String(c.comissaoPreposto),
        });
      })
      .catch(() => toasts.error('Erro ao carregar configuração.'));

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    load().finally(() => setLoading(false));
  }, [user?.tipo, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = Math.max(0, Math.min(100, Number(form.comissaoVendedor)));
    const p = Math.max(0, Math.min(100, Number(form.comissaoPreposto)));
    if (Number.isNaN(v) || Number.isNaN(p)) {
      toasts.warning('Informe percentuais válidos (0 a 100).');
      return;
    }
    setSaving(true);
    try {
      await vendasApi.updateConfigComissoes(v, p);
      setForm({ comissaoVendedor: String(v), comissaoPreposto: String(p) });
      toasts.success('Comissões atualizadas com sucesso.');
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (user?.tipo !== 'admin') return null;
  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">Carregando...</div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-2xl font-bold text-slate-800">Configuração de comissões</h2>
      <p className="text-slate-600">
        Defina os percentuais de comissão para vendedor e preposto. Estes valores serão usados no cálculo automático quando um pagamento for confirmado.
      </p>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputIcon
            icon={<Percent className="w-5 h-5" />}
            label="Comissão do vendedor (%)"
            placeholder="Ex.: 20"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={form.comissaoVendedor}
            onChange={(e) => setForm((f) => ({ ...f, comissaoVendedor: e.target.value }))}
            required
          />
          <InputIcon
            icon={<Percent className="w-5 h-5" />}
            label="Comissão do preposto (%)"
            placeholder="Ex.: 5"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={form.comissaoPreposto}
            onChange={(e) => setForm((f) => ({ ...f, comissaoPreposto: e.target.value }))}
            required
          />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
