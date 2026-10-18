package com.fluxguard.repository;

import com.fluxguard.entity.TelemetryRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TelemetryRecordRepository extends JpaRepository<TelemetryRecord, Long> {

    Page<TelemetryRecord> findByMotorAssetIdOrderByTimestampMsDesc(Long motorAssetId, Pageable pageable);

    @Query("SELECT t FROM TelemetryRecord t WHERE t.motorAsset.id = :motorAssetId ORDER BY t.timestampMs DESC LIMIT :limit")
    List<TelemetryRecord> findRecentByMotorAssetId(Long motorAssetId, int limit);
}
