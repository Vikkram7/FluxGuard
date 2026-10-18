package com.fluxguard.repository;

import com.fluxguard.entity.DiagnosticEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiagnosticEventRepository extends JpaRepository<DiagnosticEvent, Long> {
    List<DiagnosticEvent> findTop50ByMotorAssetIdOrderByTimestampDesc(Long motorAssetId);
    Page<DiagnosticEvent> findByMotorAssetIdOrderByTimestampDesc(Long motorAssetId, Pageable pageable);
}
