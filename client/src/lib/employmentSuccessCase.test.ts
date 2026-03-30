import { describe, expect, it } from 'vitest';
import {
  buildClientEmploymentUpdateRecord,
  maskKoreanName,
  toAgeDecade,
} from './employmentSuccessCase';

describe('employmentSuccessCase helpers', () => {
  it('masks Korean names to family-name plus OO', () => {
    expect(maskKoreanName('김민수')).toBe('김OO');
    expect(maskKoreanName(' 박지영 ')).toBe('박OO');
  });

  it('falls back to 익명 for empty names', () => {
    expect(maskKoreanName('')).toBe('익명');
    expect(maskKoreanName(null)).toBe('익명');
  });

  it('converts ages to decade buckets', () => {
    expect(toAgeDecade(24)).toBe('20대');
    expect(toAgeDecade(37)).toBe('30대');
    expect(toAgeDecade(61)).toBe('60대 이상');
  });

  it('returns 연령 미상 for invalid ages', () => {
    expect(toAgeDecade(null)).toBe('연령 미상');
    expect(toAgeDecade(0)).toBe('연령 미상');
  });

  it('normalizes employment snapshot updates into client table columns', () => {
    expect(buildClientEmploymentUpdateRecord({
      participationStage: '취업완료',
      desiredJob1: '백엔드 개발자',
      desiredJob2: '웹 개발자',
      desiredJob3: '',
      employmentType: '정규직',
      employmentCompany: '  제니소프트  ',
      employmentJobType: '서버 개발',
      employmentSalary: '3200만원',
      employmentDate: '2026-03-15T09:12:00+09:00',
      hireDate: '2026/03/16',
    })).toEqual({
      participation_stage: '취업완료',
      desired_job_1: '백엔드 개발자',
      desired_job_2: '웹 개발자',
      desired_job_3: null,
      hire_type: '정규직',
      hire_place: '제니소프트',
      hire_job_type: '서버 개발',
      hire_payment: '3200만원',
      job_place_start: '2026-03-15',
      hire_date: '2026-03-16',
    });
  });

  it('keeps undefined fields out of snapshot update records', () => {
    expect(buildClientEmploymentUpdateRecord({
      employmentCompany: '오픈AI',
    })).toEqual({
      hire_place: '오픈AI',
    });
  });
});
