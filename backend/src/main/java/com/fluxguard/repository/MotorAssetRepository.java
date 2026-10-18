package com.fluxguard.repository;

import com.fluxguard.entity.MotorAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MotorAssetRepository extends JpaRepository<MotorAsset, Long> {
    Optional<MotorAsset> findByAssetTag(String assetTag);
}
