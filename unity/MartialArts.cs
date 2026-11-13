using System.Collections;
using UnityEngine;

// 항룡십팔장 (Eighteen Dragon-Subduing Palms) for the martial hero (models/player/martialHero.glb).
// Each skill plays a full-body clip and, at its release moment, launches the dragon palm
// force (models/wuxia/dragonPalm.glb with DragonPalm.cs) from the right hand.
// Values below match models/items.json -> wuxia.dragonPalm.skills.
//
// Setup: add next to PlayerAnimations on the player (set its Empty Hand Idle to "martialIdle"),
// put the DragonPalm prefab in `palmPrefab`, then call KangLong(), FeiLong() or ShenLong().
// Not tested inside Unity by the author of this file: adjust if your project differs.
public class MartialArts : MonoBehaviour
{
    [System.Serializable]
    public class Skill
    {
        public string clip;
        [Range(0f, 1f)] public float releaseTime;
        public Vector3 direction; // player-local, +Z forward
        public float damage = 40f;
        public float cooldown = 1.5f;
        [HideInInspector] public float readyAt;
    }

    public GameObject palmPrefab;
    public Skill kangLong = new Skill { clip = "palmKangLong", releaseTime = 0.55f, direction = new Vector3(0, 0, 1), damage = 40f };
    public Skill feiLong = new Skill { clip = "palmFeiLong", releaseTime = 0.62f, direction = new Vector3(0, -0.55f, 1), damage = 55f, cooldown = 2.5f };
    public Skill shenLong = new Skill { clip = "palmShenLong", releaseTime = 0.5f, direction = new Vector3(0, 0, -1), damage = 35f };

    Animation anim;
    PlayerAnimations player;
    Transform handR;

    void Awake()
    {
        anim = GetComponentInChildren<Animation>();
        player = GetComponent<PlayerAnimations>();
        handR = FindDeep(transform, "handR");
    }

    // 항룡유회 亢龍有悔: circle the palm, then push straight ahead
    public bool KangLong() => Perform(kangLong);
    // 비룡재천 飛龍在天: leap and strike down in front
    public bool FeiLong() => Perform(feiLong);
    // 신룡파미 神龍擺尾: whip around and strike behind
    public bool ShenLong() => Perform(shenLong);

    public bool Perform(Skill s)
    {
        if (Time.time < s.readyAt || anim == null || anim[s.clip] == null) return false;
        s.readyAt = Time.time + s.cooldown;
        if (player != null) player.PlayFullBody(s.clip);
        else { anim[s.clip].wrapMode = WrapMode.Once; anim.CrossFade(s.clip, 0.08f); }
        StartCoroutine(Release(s, anim[s.clip].length * s.releaseTime));
        return true;
    }

    IEnumerator Release(Skill s, float delay)
    {
        yield return new WaitForSeconds(delay);
        if (palmPrefab == null) yield break;
        Vector3 from = handR != null ? handR.position : transform.position + Vector3.up * 1.3f;
        Vector3 dir = transform.TransformDirection(s.direction).normalized;
        var go = Instantiate(palmPrefab);
        var palm = go.GetComponent<DragonPalm>();
        if (palm != null) { palm.damage = s.damage; palm.Launch(gameObject, from, dir); }
        else go.transform.SetPositionAndRotation(from, Quaternion.LookRotation(dir));
    }

    static Transform FindDeep(Transform t, string name)
    {
        if (t.name == name) return t;
        foreach (Transform c in t)
        {
            var r = FindDeep(c, name);
            if (r != null) return r;
        }
        return null;
    }
}
