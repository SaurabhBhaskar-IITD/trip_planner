import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Pencil, Plus, Tags } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { ActiveBadge } from "@/components/common/status-badge";
import { PricingTable } from "@/components/common/pricing-table";
import { PricingDialog } from "@/components/common/pricing-dialog";
import type { RoomTypeOption } from "@/components/common/pricing-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accommodationRepository, destinationRepository } from "@/server/repositories";
import type { RoomTypeDTO } from "@/types/master-data";
import { humanizeEnum } from "@/domain/shared/enums";
import { formatDate } from "@/lib/utils/format";
import { AccommodationDialog } from "../accommodation-dialog";
import { RoomTypeDialog } from "./room-type-dialog";
import { RoomTypeRowActions } from "./room-type-row-actions";

export const metadata: Metadata = { title: "Accommodation detail" };

export default async function AccommodationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { allowed, user } = await guardPage("accommodation:read");
  if (!allowed) return <AccessDenied permission="accommodation:read" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const canWrite = can(user, "accommodation:write");
  const canWritePricing = can(user, "pricing:write");
  const canViewInternal = can(user, "pricing:viewInternal");

  const { id } = await params;
  const [detail, destinationOptions] = await Promise.all([
    accommodationRepository.findDetail(id, { includeInternal: canViewInternal }),
    destinationRepository.listOptions(),
  ]);
  if (!detail) notFound();

  const detailPath = `/accommodations/${detail.id}`;
  const roomTypeOptions: RoomTypeOption[] = detail.roomTypes.map((rt) => ({
    id: rt.id,
    name: rt.name,
    occupancy: rt.occupancy,
  }));
  const priceCount = detail.roomTypes.reduce((n, rt) => n + rt.prices.length, 0);

  return (
    <>
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{detail.name}</h1>
            <ActiveBadge active={detail.active} />
            <Badge variant="secondary">{humanizeEnum(detail.category)}</Badge>
            {detail.starRating ? (
              <span className="text-sm text-warning">{"★".repeat(detail.starRating)}</span>
            ) : null}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {detail.destinationName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/accommodations">
              <ArrowLeft />
              Accommodations
            </Link>
          </Button>
          {canWrite ? (
            <AccommodationDialog
              accommodation={detail}
              destinationOptions={destinationOptions}
              trigger={
                <Button>
                  <Pencil />
                  Edit
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rooms">Room Types</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Description &amp; amenities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {detail.description || "No description yet."}
                </p>
                {detail.amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.amenities.map((a) => (
                      <Badge key={a} variant="outline" className="font-normal">
                        {a}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No amenities listed.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">At a glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Destination" value={detail.destinationName} />
                <Row label="Category" value={humanizeEnum(detail.category)} />
                <Row label="Star rating" value={detail.starRating ? `${detail.starRating}★` : "—"} />
                <Row label="Room types" value={String(detail.roomTypes.length)} />
                <Row label="Price rows" value={String(priceCount)} />
                <Row label="Status" value={<ActiveBadge active={detail.active} />} />
                <Row label="Updated" value={formatDate(detail.updatedAt)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rooms">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Room types ({detail.roomTypes.length})</CardTitle>
              {canWrite ? (
                <RoomTypeDialog
                  accommodationId={detail.id}
                  defaultCategory={detail.category}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Plus />
                      Add room type
                    </Button>
                  }
                />
              ) : null}
            </CardHeader>
            <CardContent>
              {detail.roomTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No room types yet. Add one (e.g. &quot;Deluxe Room&quot;) to start pricing.
                </p>
              ) : (
                <ul className="divide-y">
                  {detail.roomTypes.map((rt) => (
                    <li key={rt.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{rt.name}</span>
                          <Badge variant="secondary">{humanizeEnum(rt.occupancy)}</Badge>
                          <Badge variant="outline" className="font-normal">
                            {humanizeEnum(rt.category)}
                          </Badge>
                          {!rt.active ? <ActiveBadge active={false} /> : null}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {rt.maxOccupancy ? `Max ${rt.maxOccupancy} · ` : ""}
                          {rt.prices.length} price row(s)
                        </div>
                      </div>
                      {canWrite ? (
                        <RoomTypeRowActions accommodationId={detail.id} roomType={rt} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          {detail.roomTypes.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Add a room type first — accommodation prices are attached to a room type.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {detail.roomTypes.map((rt: RoomTypeDTO) => (
                <Card key={rt.id}>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Tags className="size-4 text-muted-foreground" />
                      {rt.name}
                      <Badge variant="secondary">{humanizeEnum(rt.occupancy)}</Badge>
                    </CardTitle>
                    {canWritePricing ? (
                      <PricingDialog
                        kind="accommodation"
                        parentId={rt.id}
                        detailPath={detailPath}
                        roomTypes={roomTypeOptions}
                        initialRoomTypeId={rt.id}
                        canViewInternal={canViewInternal}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Plus />
                            Add price
                          </Button>
                        }
                      />
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    <PricingTable
                      kind="accommodation"
                      parentId={rt.id}
                      detailPath={detailPath}
                      prices={rt.prices}
                      canWrite={canWritePricing}
                      canViewInternal={canViewInternal}
                      roomTypes={roomTypeOptions}
                      initialRoomTypeId={rt.id}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
