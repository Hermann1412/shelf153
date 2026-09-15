import { useCallback, useEffect, useState } from "react";
import { Landmark, LoaderCircle } from "lucide-react";
import { toast } from "react-toastify";
import { axiosInstance } from "../lib/axios";

const Input = (props) => <input {...props} className="w-full rounded-lg border px-3 py-2 text-sm" />;

const Finance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState("");
  const [refund, setRefund] = useState({ orderId: "", itemId: "", amount: "", reference: "" });
  const [fee, setFee] = useState({ kind: "payment", id: "", amount: "", reason: "" });
  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await axiosInstance.get("/admin/finance")).data); }
    catch (error) { toast.error(error.response?.data?.message || "Chargement financier impossible."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitRate = async (event) => {
    event.preventDefault();
    try {
      await axiosInstance.post("/admin/finance/exchange-rates", { sourceCurrency: "USD", destinationCurrency: "CDF", rate });
      toast.success("Taux USD/CDF enregistré."); setRate(""); await load();
    } catch (error) { toast.error(error.response?.data?.message || "Taux invalide."); }
  };
  const submitRefund = async (event) => {
    event.preventDefault();
    try {
      await axiosInstance.post(`/refund/order/${refund.orderId}/item/${refund.itemId}`, { grossAmount: refund.amount, externalReference: refund.reference });
      toast.success("Remboursement transmis ou mis en réconciliation.");
      setRefund({ orderId: "", itemId: "", amount: "", reference: "" }); await load();
    } catch (error) { toast.error(error.response?.data?.message || "Remboursement impossible."); }
  };
  const submitFee = async (event) => {
    event.preventDefault();
    const path = fee.kind === "payment" ? `/order/payment/${fee.id}/fee` : `/payout/${fee.id}/fee`;
    try {
      await axiosInstance.patch(path, { fee: fee.amount, currency: "USD", reason: fee.reason });
      toast.success("Frais corrigés et audités."); setFee({ kind: "payment", id: "", amount: "", reason: "" }); await load();
    } catch (error) { toast.error(error.response?.data?.message || "Correction impossible."); }
  };
  if (loading && !data) return <div className="flex justify-center py-20"><LoaderCircle className="animate-spin" /></div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Landmark className="text-green-600" /><div><h2 className="text-2xl font-bold">Finance</h2><p className="text-sm text-gray-500">Ledger, remboursements, dettes, frais et taux de change.</p></div></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={submitRate} className="space-y-3 rounded-xl bg-white p-4 shadow-sm"><h3 className="font-semibold">Nouveau taux USD → CDF</h3><Input required inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Ex. 2800" /><button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Activer ce taux</button><p className="text-xs text-gray-500">Actuel : {data?.activeRate?.rate || "non configuré"} ({data?.activeRate?.source || "-"})</p></form>
        <form onSubmit={submitRefund} className="space-y-3 rounded-xl bg-white p-4 shadow-sm"><h3 className="font-semibold">Remboursement pawaPay</h3><Input required value={refund.orderId} onChange={(e) => setRefund({ ...refund, orderId: e.target.value })} placeholder="ID commande" /><Input required value={refund.itemId} onChange={(e) => setRefund({ ...refund, itemId: e.target.value })} placeholder="ID article" /><Input required inputMode="decimal" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} placeholder="Montant USD" /><Input required value={refund.reference} onChange={(e) => setRefund({ ...refund, reference: e.target.value })} placeholder="Référence idempotente" /><button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Rembourser</button></form>
        <form onSubmit={submitFee} className="space-y-3 rounded-xl bg-white p-4 shadow-sm"><h3 className="font-semibold">Correction de frais</h3><select className="w-full rounded-lg border px-3 py-2 text-sm" value={fee.kind} onChange={(e) => setFee({ ...fee, kind: e.target.value })}><option value="payment">Dépôt client</option><option value="payout">Payout vendeur</option></select><Input required value={fee.id} onChange={(e) => setFee({ ...fee, id: e.target.value })} placeholder={fee.kind === "payment" ? "ID commande" : "ID payout"} /><Input required inputMode="decimal" value={fee.amount} onChange={(e) => setFee({ ...fee, amount: e.target.value })} placeholder="Frais USD" /><Input required value={fee.reason} onChange={(e) => setFee({ ...fee, reason: e.target.value })} placeholder="Motif obligatoire" /><button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Enregistrer</button></form>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-white p-4 shadow-sm"><h3 className="mb-3 font-semibold">Remboursements</h3><div className="space-y-2 text-sm">{data?.refunds?.map((item) => <div key={item.id} className="flex justify-between border-b py-2"><span className="font-mono text-xs">{item.id.slice(0, 8)}…</span><span>{item.provider_currency} {Number(item.provider_amount).toLocaleString()}</span><span>{item.status}</span></div>)}</div></section>
        <section className="rounded-xl bg-white p-4 shadow-sm"><h3 className="mb-3 font-semibold">Dettes vendeurs</h3><div className="space-y-2 text-sm">{data?.debts?.map((item) => <div key={item.id} className="flex justify-between border-b py-2"><span className="font-mono text-xs">{item.seller_id.slice(0, 8)}…</span><span>{item.currency} {Number(item.remaining_amount).toLocaleString()}</span><span>{item.status}</span></div>)}</div></section>
        <section className="rounded-xl bg-white p-4 shadow-sm xl:col-span-2"><h3 className="mb-3 font-semibold">Dernières écritures ledger</h3><div className="max-h-96 overflow-auto text-sm">{data?.ledger?.map((item) => <div key={item.id} className="grid grid-cols-4 gap-2 border-b py-2"><span>{item.type}</span><span>{item.currency} {Number(item.amount).toLocaleString()}</span><span className="font-mono text-xs">{item.order_id?.slice(0, 8) || "-"}</span><span>{new Date(item.created_at).toLocaleString()}</span></div>)}</div></section>
      </div>
    </div>
  );
};

export default Finance;
