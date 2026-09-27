import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardMockup } from "@/components/brand/CardMockup";
import { Loading, PageTitle } from "@/components/dashboard/Stat";
import { useMyCards, useMyProfile } from "@/hooks/useMyData";
import { cardRedirectUrl } from "@/lib/site";
import { downloadQrPng, downloadQrSvg, qrDataUrl } from "@/services/qrService";
import { setMyCardStatus } from "@/services/cardService";

export const Route = createFileRoute("/_authenticated/dashboard/card")({
  component: MyCard,
});

function MyCard() {
  const qc = useQueryClient();
  const profile = useMyProfile();
  const cards = useMyCards(!!profile.data);
  const card = cards.data?.[0];
  const [qr, setQr] = useState<string>();

  useEffect(() => {
    if (card) qrDataUrl(cardRedirectUrl(card.card_code, "qr")).then(setQr);
  }, [card]);

  if (!card) return <Loading />;
  const qrUrl = cardRedirectUrl(card.card_code, "qr");
  const nfcUrl = cardRedirectUrl(card.card_code, "nfc");

  async function toggle() {
    try {
      await setMyCardStatus(card!.id, card!.status === "active" ? "disabled" : "active");
      qc.invalidateQueries({ queryKey: ["my-cards"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="space-y-8">
      <PageTitle title="My card" subtitle="Your QR code and NFC link both open the same profile." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <CardMockup cardCode={card.card_code} qrSrc={qr} />
          <div className="flex items-center gap-3">
            <Badge variant={card.status === "active" ? "default" : "secondary"}>{card.status}</Badge>
            {card.status !== "pending" && <Button size="sm" variant="outline" onClick={toggle}>{card.status === "active" ? "Disable card" : "Re-enable card"}</Button>}
          </div>
          <p className="text-xs text-muted-foreground">{card.status === "pending" ? "Your card is awaiting activation by 4N HUB." : "When disabled, taps and scans won't open your profile."}</p>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border p-5">
            <h2 className="font-display font-semibold text-foreground">QR code</h2>
            {qr && <img src={qr} alt="Card QR code" className="mt-4 w-40 rounded-md bg-foreground p-2" />}
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => downloadQrPng(qrUrl, `${card.card_code}.png`)}><Download className="mr-1 h-4 w-4" />PNG</Button>
              <Button size="sm" variant="outline" onClick={() => downloadQrSvg(qrUrl, `${card.card_code}.svg`)}><Download className="mr-1 h-4 w-4" />SVG</Button>
            </div>
          </div>
          <div className="rounded-xl border border-border p-5">
            <h2 className="font-display font-semibold text-foreground">NFC link</h2>
            <p className="mt-1 text-sm text-muted-foreground">Write this URL to your card's NFC chip (NDEF URL record) with any NFC writer app.</p>
            <div className="mt-3 flex gap-2">
              <Input readOnly value={nfcUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copy(nfcUrl)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
