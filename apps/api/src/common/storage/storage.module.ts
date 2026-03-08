import { Global, Module } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';
import { StorageService } from './storage.service';

@Global()
@Module({
	providers: [SupabaseStorageService, StorageService],
	exports: [SupabaseStorageService, StorageService],
})
export class StorageModule {}
