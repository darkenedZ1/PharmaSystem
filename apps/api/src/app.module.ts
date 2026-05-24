import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PosModule } from './modules/pos/pos.module';
import { FbrModule } from './modules/fbr/fbr.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { DrugInteractionsModule } from './modules/drug-interactions/drug-interactions.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { AdminModule } from './modules/admin/admin.module';
import { DrugSyncModule } from './modules/drug-sync/drug-sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    BullModule.forRoot({
      redis: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),

    PrismaModule,

    // ── Core (always loaded) ─────────────────────────────────
    AuthModule,
    TenantsModule,
    UsersModule,

    // ── Feature modules (routes guarded by @RequiresModule) ──
    InventoryModule,
    PosModule,
    FbrModule,
    PurchasingModule,
    PrescriptionsModule,
    DrugInteractionsModule,
    AccountsModule,
    PayrollModule,
    NotificationsModule,
    ReportsModule,
    LoyaltyModule,
    DeliveryModule,

    // ── Drug sync (global, no module gate) ───────────────────
    DrugSyncModule,

    // ── Internal SaaS admin ──────────────────────────────────
    AdminModule,
  ],
})
export class AppModule {}
