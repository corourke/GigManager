import { describe, it, expect } from 'vitest';
import { getOrthogonalPoints, Obstacle } from '../routing';

describe('routing', () => {
  describe('getOrthogonalPoints', () => {
    it('should return a path with at least 2 points', () => {
      const pts = getOrthogonalPoints(0, 0, 100, 100, []);
      expect(pts.length).toBeGreaterThanOrEqual(2);
      expect(pts[0]).toEqual({ x: 0, y: 0 });
      expect(pts[pts.length - 1]).toEqual({ x: 100, y: 100 });
    });

    it('should handle forward routing with a simple Z-path', () => {
      const pts = getOrthogonalPoints(0, 50, 200, 50, []);
      expect(pts[0].x).toBe(0);
      expect(pts[pts.length - 1].x).toBe(200);
    });

    it('should handle backwards routing by going around', () => {
      const x1 = 300, y1 = 50;
      const x2 = 0, y2 = 50;
      const obstacles: Obstacle[] = [
        { id: 'obs1', left: 50, top: 40, right: 250, bottom: 60 }
      ];
      
      const pts = getOrthogonalPoints(x1, y1, x2, y2, obstacles, 0, 0, 0, 0, 'src', 'dst');
      
      const segmentIntersects = (a: any, b: any, obs: any) => {
        const left = obs.left, top = obs.top, right = obs.right, bottom = obs.bottom;
        const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
        if (maxX <= left || minX >= right || maxY <= top || minY >= bottom) return false;
        return true;
      };

      for (let i = 0; i < pts.length - 1; i++) {
        expect(segmentIntersects(pts[i], pts[i+1], obstacles[0])).toBe(false);
      }

      expect(pts.length).toBeGreaterThanOrEqual(5);
    });

    it('should avoid the destination device body', () => {
      const x1 = 0, y1 = 100;
      const x2 = 300, y2 = 100;
      const dstObs: Obstacle = { id: 'dst', left: 300, top: 50, right: 400, bottom: 150 };
      const obs2: Obstacle = { id: 'obs2', left: 50, top: 0, right: 150, bottom: 200 };
      const obstacles = [dstObs, obs2];
      
      const pts = getOrthogonalPoints(x1, y1, x2, y2, obstacles, 0, 0, 0, 0, 'src', 'dst');
      
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i+1];
        if (i === pts.length - 2) continue; // Skip last stub connecting to destination
        
        const isInside = (p: any, box: any) => p.x > box.left && p.x < box.right && p.y > box.top && p.y < box.bottom;
        expect(isInside(a, dstObs)).toBe(false);
        expect(isInside(b, dstObs)).toBe(false);
      }
    });

    it('should respect offsets for parallel lines', () => {
      const pts1 = getOrthogonalPoints(0, 50, 400, 150, [], 0, 0, 0, 0);
      const pts2 = getOrthogonalPoints(0, 50, 400, 150, [], 10, 0, 10, 0);
      
      const osx1 = pts1[2].x;
      const osx2 = pts2[2].x;
      expect(Math.abs(osx2 - osx1)).toBeGreaterThan(5);

      const oex1 = pts1[pts1.length-3].x;
      const oex2 = pts2[pts2.length-3].x;
      expect(Math.abs(oex2 - oex1)).toBeGreaterThan(5);
    });

    it('should offset bypass vertical segments with offsets', () => {
      // Force a bypass (backwards)
      const x1 = 300, y1 = 50;
      const x2 = 0, y2 = 50;
      const obstacles: Obstacle[] = [{ id: 'obs', left: 50, top: 0, right: 250, bottom: 100 }];
      
      const pts1 = getOrthogonalPoints(x1, y1, x2, y2, obstacles, 0, 0, 0, 0, 'src', 'dst');
      const pts2 = getOrthogonalPoints(x1, y1, x2, y2, obstacles, 5, 0, 5, 0, 'src', 'dst');

      // osx
      const srcVertical1 = pts1[2].x; 
      const srcVertical2 = pts2[2].x;
      expect(srcVertical2 - srcVertical1).toBeCloseTo(5);

      // oex
      const dstVertical1 = pts1[pts1.length - 3].x; 
      const dstVertical2 = pts2[pts2.length - 3].x;
      expect(dstVertical1 - dstVertical2).toBeCloseTo(-5); // ex is x2 - stub, so oex = ex + offset. 
      // ex = -30. ex + 5 = -25. -25 - (-30) = 5. Wait.
      // ex = x2 - stub. x2=0. ex=-30. oex = ex + dstOffsetX. oex1 = -30 + 0 = -30. oex2 = -30 + 5 = -25.
      // dstVertical2 - dstVertical1 = -25 - (-30) = 5.
    });

  });
});
