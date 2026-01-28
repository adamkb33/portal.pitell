import type { Route } from './+types/company.booking.route';
import { CompanyUserBookingController } from '~/api/generated/booking';
import { Card, CardContent } from '~/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Award,
  Clock,
  Activity,
  Package,
  UserCheck,
  MousePointer,
  BarChart3,
  Target,
  Image,
  AlertCircle,
  CalendarClock,
  User,
  Briefcase,
} from 'lucide-react';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const [metricsResponse] = await withAuth(request, async () => {
      return Promise.all([await CompanyUserBookingController.getCompanyBookingMetrics()]);
    });

    if (!metricsResponse.data) {
      throw Error('Det skjedde en feil, kontakt support');
    }

    return {
      metrics: metricsResponse.data.data,
    };
  } catch (error: any) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente nøkkeltall');
    return { error: message };
  }
}

export default function CompanyBookingPage({ loaderData }: Route.ComponentProps) {
  const { metrics } = loaderData;

  if (!metrics) {
    return <></>;
  }

  const { summary, profiles } = metrics;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Hero Stats - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated" className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Omsetning Denne Måneden</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {formatCurrency(summary.revenue.revenueThisMonth)}
                </p>
                <p
                  className={`text-sm mt-1 flex items-center gap-1 ${summary.revenue.monthOverMonthChangePercent >= 0 ? 'text-secondary' : 'text-destructive'}`}
                >
                  {summary.revenue.monthOverMonthChangePercent >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {Math.abs(summary.revenue.monthOverMonthChangePercent).toFixed(2)}% fra forrige måned
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timer Denne Måneden</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {profiles.reduce((sum, p) => sum + p.totalHoursThisMonth, 0).toFixed(1)}t
                </p>
                <p className="text-sm text-muted-foreground mt-1">{summary.bookings.appointmentsThisMonth} avtaler</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unike Kunder</p>
                <p className="text-3xl font-bold text-foreground mt-2">{summary.customers.uniqueCustomersThisMonth}</p>
                <p className="text-sm text-muted-foreground mt-1">{summary.customers.returningCustomers} gjengangere</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Sections */}
      <Accordion type="multiple" className="space-y-4">
        {/* Revenue & Financial Section */}
        <AccordionItem value="revenue" className="bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">Omsetning & Økonomi</h3>
                  <p className="text-sm text-muted-foreground">Inntekter, trender og prognoser</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                {/* Revenue Overview */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground">Omsetningsoversikt</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricBox
                      label="I Dag"
                      value={formatCurrency(summary.revenue.revenueToday)}
                      icon={<Calendar className="h-4 w-4" />}
                      variant="info"
                    />
                    <MetricBox
                      label="Denne Måneden"
                      value={formatCurrency(summary.revenue.revenueThisMonth)}
                      icon={<TrendingUp className="h-4 w-4" />}
                      variant="success"
                    />
                    <MetricBox
                      label="Forrige Måned"
                      value={formatCurrency(summary.revenue.revenueLastMonth)}
                      icon={<Clock className="h-4 w-4" />}
                      variant="neutral"
                    />
                    <MetricBox
                      label="Prognose"
                      value={formatCurrency(summary.revenue.projectedRevenue)}
                      icon={<Target className="h-4 w-4" />}
                      variant="info"
                    />
                  </div>
                </div>

                {/* Revenue by Service Group */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-secondary" />
                    </div>
                    <h4 className="font-semibold text-foreground">Omsetning per Tjenestegruppe</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {summary.revenue.revenueByServiceGroup.map((group) => (
                      <div key={group.groupId} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-foreground">{group.groupName}</p>
                          <p className="text-xs text-muted-foreground">{group.appointmentCount} avtaler</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">{formatCurrency(group.totalRevenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Average Appointment Value */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gjennomsnittlig Avtaleverdi</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatCurrency(summary.revenue.averageAppointmentValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Booking Activity Section */}
        <AccordionItem value="bookings" className="bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-secondary" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">Bestillingsaktivitet</h3>
                  <p className="text-sm text-muted-foreground">Avtaler, trender og topptider</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                {/* Booking Stats */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-secondary" />
                    </div>
                    <h4 className="font-semibold text-foreground">Avtalestatistikk</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricBox
                      label="I Dag"
                      value={summary.bookings.appointmentsToday}
                      icon={<Calendar className="h-4 w-4" />}
                      variant="info"
                    />
                    <MetricBox
                      label="Kommende 7 Dager"
                      value={summary.bookings.upcomingSevenDays}
                      icon={<CalendarClock className="h-4 w-4" />}
                      variant="warning"
                    />
                    <MetricBox
                      label="Denne Måneden"
                      value={summary.bookings.appointmentsThisMonth}
                      icon={<TrendingUp className="h-4 w-4" />}
                      variant="success"
                    />
                    <MetricBox
                      label="Endring M/M"
                      value={`${summary.bookings.monthOverMonthChangePercent >= 0 ? '+' : ''}${summary.bookings.monthOverMonthChangePercent.toFixed(2)}%`}
                      icon={
                        summary.bookings.monthOverMonthChangePercent >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )
                      }
                      variant={summary.bookings.monthOverMonthChangePercent >= 0 ? 'success' : 'error'}
                    />
                  </div>
                </div>

                {/* Peak Booking Times */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-chart-3" />
                    </div>
                    <h4 className="font-semibold text-foreground">Topptider for Bestillinger</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {summary.bookings.peakBookingTimes.slice(0, 6).map((peak, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-sm font-medium text-foreground">{peak.dayOfWeek}</p>
                        <p className="text-xs text-muted-foreground">Kl. {peak.hour}:00</p>
                        <p className="text-lg font-bold text-foreground mt-1">{peak.bookingCount} avtaler</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 30-Day Trend */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground">30-Dagers Trend</h4>
                  </div>
                  <div className="h-24 flex items-end gap-1">
                    {summary.bookings.trendLast30Days.map((day, idx) => {
                      const maxCount = Math.max(...summary.bookings.trendLast30Days.map((d) => d.count));
                      const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-primary/20 rounded-t hover:bg-primary/40 transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${day.date}: ${day.count} avtaler`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Service Performance Section */}
        <AccordionItem value="services" className="bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-chart-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">Tjenesteytelse</h3>
                  <p className="text-sm text-muted-foreground">Populære tjenester og optimaliseringsmuligheter</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                {/* Service Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricBox
                    label="Aktive Tjenester"
                    value={summary.services.totalActiveServices}
                    icon={<Package className="h-4 w-4" />}
                    variant="success"
                  />
                  <MetricBox
                    label="Tjenestegrupper"
                    value={summary.services.totalServiceGroups}
                    icon={<Briefcase className="h-4 w-4" />}
                    variant="info"
                  />
                  <MetricBox
                    label="Uten Bilder"
                    value={summary.services.servicesWithoutImages}
                    icon={<Image className="h-4 w-4" />}
                    variant={summary.services.servicesWithoutImages > 0 ? 'warning' : 'success'}
                  />
                  <MetricBox
                    label="Aldri Bestilt"
                    value={summary.services.neverBookedServices.length}
                    icon={<AlertCircle className="h-4 w-4" />}
                    variant={summary.services.neverBookedServices.length > 0 ? 'warning' : 'success'}
                  />
                </div>

                {/* Most Popular Services */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Award className="h-4 w-4 text-secondary" />
                    </div>
                    <h4 className="font-semibold text-foreground">Mest Populære Tjenester</h4>
                  </div>
                  <div className="space-y-2">
                    {summary.services.mostPopularServices.map((service, idx) => (
                      <div
                        key={service.serviceId}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-secondary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-secondary">#{idx + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{service.serviceName}</p>
                            <p className="text-xs text-muted-foreground">{service.groupName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{formatCurrency(service.totalRevenue)}</p>
                          <p className="text-xs text-muted-foreground">{service.bookingCount} bestillinger</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Never Booked Services */}
                {summary.services.neverBookedServices.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <h4 className="font-semibold text-foreground">Tjenester Uten Bestillinger</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {summary.services.neverBookedServices.map((service) => (
                        <div
                          key={service.serviceId}
                          className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{service.serviceName}</p>
                            <p className="text-xs text-muted-foreground">{service.groupName}</p>
                          </div>
                          <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(service.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Customer Insights Section */}
        <AccordionItem value="customers" className="bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-chart-3" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">Kundeinnsikt</h3>
                  <p className="text-sm text-muted-foreground">Kundeanalyse og engasjement</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricBox
                    label="Totalt Unike"
                    value={summary.customers.totalUniqueCustomers}
                    icon={<Users className="h-4 w-4" />}
                    variant="info"
                  />
                  <MetricBox
                    label="Nye Denne Måneden"
                    value={summary.customers.uniqueCustomersThisMonth}
                    icon={<UserCheck className="h-4 w-4" />}
                    variant="success"
                  />
                  <MetricBox
                    label="Gjengangere"
                    value={summary.customers.returningCustomers}
                    icon={<Award className="h-4 w-4" />}
                    variant="success"
                  />
                  <MetricBox
                    label="Gj.snitt Avtaler"
                    value={summary.customers.averageAppointmentsPerCustomer.toFixed(1)}
                    icon={<BarChart3 className="h-4 w-4" />}
                    variant="neutral"
                  />
                </div>

                <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <CalendarClock className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Kunder med Kommende Avtaler</p>
                        <p className="text-2xl font-bold text-foreground">
                          {summary.customers.customersWithUpcomingAppointments}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Session Analytics Section */}
        <AccordionItem value="sessions" className="bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MousePointer className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">Øktanalyse</h3>
                  <p className="text-sm text-muted-foreground">Brukerøkter og konverteringsrater</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox
                  label="Aktive Økter"
                  value={summary.sessions.activeSessions}
                  icon={<Activity className="h-4 w-4" />}
                  variant="info"
                />
                <MetricBox
                  label="Fullførte (30d)"
                  value={summary.sessions.completedSessionsLast30Days}
                  icon={<Award className="h-4 w-4" />}
                  variant="success"
                />
                <MetricBox
                  label="Forlatte (30d)"
                  value={summary.sessions.abandonedSessionsLast30Days}
                  icon={<AlertCircle className="h-4 w-4" />}
                  variant="warning"
                />
                <MetricBox
                  label="Konvertering"
                  value={`${summary.sessions.sessionToBookingConversionRate}%`}
                  icon={<Target className="h-4 w-4" />}
                  variant="success"
                />
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gjennomsnittlig Økttid</p>
                    <p className="text-xl font-bold text-foreground">
                      {(summary.sessions.averageSessionDurationMinutes / 60).toFixed(2)} timer
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Profile Breakdown Section */}
        <AccordionItem value="profiles" className="bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-chart-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">Profilanalyse</h3>
                  <p className="text-sm text-muted-foreground">Ytelse per ansatt</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <Card key={profile.profileId} variant="ghost">
                    <CardContent className="pt-6">
                      {/* Profile Header */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {profile.profileImageUrl ? (
                            <img
                              src={profile.profileImageUrl}
                              alt={profile.profileName}
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-foreground">{profile.profileName}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {profile.totalHoursThisMonth}t denne måneden
                            </span>
                            {!profile.hasSchedule && (
                              <span className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Ingen timeplan
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Profile Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Omsetning</p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(profile.revenueThisMonth)}
                          </p>
                          <p
                            className={`text-xs mt-1 ${profile.revenueThisMonth - profile.revenueLastMonth >= 0 ? 'text-secondary' : 'text-destructive'}`}
                          >
                            {profile.revenueThisMonth > profile.revenueLastMonth ? '+' : ''}
                            {formatCurrency(profile.revenueThisMonth - profile.revenueLastMonth)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Avtaler</p>
                          <p className="text-lg font-bold text-foreground">{profile.appointmentsThisMonth}</p>
                          <p className="text-xs text-muted-foreground mt-1">Kommende: {profile.upcomingSevenDays}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Gj.snitt Verdi</p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(profile.averageAppointmentValue)}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Kunder</p>
                          <p className="text-lg font-bold text-foreground">{profile.uniqueCustomersThisMonth}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {profile.returningCustomerCount} gjengangere
                          </p>
                        </div>
                      </div>

                      {/* Projected Revenue */}
                      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Anslått Månedsomsetning</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(profile.projectedRevenue)}
                          </span>
                        </div>
                      </div>

                      {/* Upcoming Unavailability */}
                      {profile.upcomingUnavailability.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-foreground mb-2">Kommende Fravær</p>
                          <div className="space-y-1">
                            {profile.upcomingUnavailability.map((unavail, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                                <CalendarClock className="h-3 w-3" />
                                <span>
                                  {formatDateTime(unavail.startTime)} - {formatDateTime(unavail.endTime)}
                                </span>
                                {unavail.reason && <span className="text-foreground">({unavail.reason})</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// ============================================
// UTILITY COMPONENTS
// ============================================

type MetricBoxProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant: 'success' | 'error' | 'warning' | 'info' | 'neutral';
};

function MetricBox({ label, value, icon, variant }: MetricBoxProps) {
  const variantStyles = {
    success: 'bg-secondary/10 text-secondary',
    error: 'bg-destructive/10 text-destructive',
    warning: 'bg-chart-3/10 text-chart-3',
    info: 'bg-primary/10 text-primary',
    neutral: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="p-4 rounded-lg bg-muted/30 space-y-2">
      <div className={`inline-flex items-center justify-center h-8 w-8 rounded ${variantStyles[variant]}`}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
